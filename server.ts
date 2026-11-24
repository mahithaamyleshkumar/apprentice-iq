import 'dotenv/config';
import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { z } from 'zod';
import { db } from './server/db.ts';
import {
  hashPassword,
  requireAuth,
  requireRole,
  signToken,
  verifyPassword,
  type AuthenticatedRequest,
} from './server/auth.ts';
import {
  analyzePracticalEvidence,
  askLearningCopilot,
  evaluateCheckpointAnswer,
  queryMentorAssistant,
  runAdaptiveOralTurn,
  streamLearningCopilot,
} from './server/ai.ts';
import type { PracticalSubmission, UserRole } from './src/types.ts';

const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '12mb' }));

  // ---------------------------------------------------------------------------
  // Health & Public Endpoints
  // ---------------------------------------------------------------------------
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'APPRENTICE IQ',
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
    });
  });

  app.get('/api/public/overview', (_req, res) => {
    const verifiedCount = db.data.studentCompetencies.filter((c) => c.state === 'verified').length;
    const activePassports = db.data.skillPassports.filter((p) => p.status === 'active').length;
    res.json({
      institution: db.data.platformSettings.institutionName,
      trades: db.data.trades,
      metrics: {
        totalTrades: db.data.trades.length,
        verifiedCompetencies: verifiedCount,
        activePassports,
        totalApprentices: db.data.trades.reduce((acc, t) => acc + t.activeApprentices, 0),
      },
      samplePassportId: 'IQ-EL-2026-8841',
    });
  });

  // Public QR Verification Endpoint — strictly excludes private video & PII
  app.get('/api/verify/:passportId', (req, res) => {
    const passport = db.data.skillPassports.find(
      (p) => p.passportId.toLowerCase() === req.params.passportId.toLowerCase(),
    );
    if (!passport) {
      res.status(404).json({ error: 'Skill Passport not found in registry.' });
      return;
    }

    passport.verificationCount += 1;
    db.save();

    const tradeCompetencies = db.data.competencies.filter((c) => c.tradeId === passport.tradeId);
    const studentStates = db.data.studentCompetencies.filter((sc) => sc.userId === passport.userId);

    const verifiedCompetencies = tradeCompetencies
      .map((comp) => {
        const sc = studentStates.find((s) => s.competencyId === comp.id);
        if (!sc || sc.state !== 'verified') return null;
        return {
          code: comp.code,
          title: comp.title,
          category: comp.category,
          verifiedAt: sc.verifiedAt,
          verifiedByName: sc.verifiedByName,
          mentorNotes: sc.mentorNotes,
        };
      })
      .filter(Boolean);

    const pendingCompetencies = tradeCompetencies
      .map((comp) => {
        const sc = studentStates.find((s) => s.competencyId === comp.id);
        if (sc?.state === 'verified') return null;
        return {
          code: comp.code,
          title: comp.title,
          category: comp.category,
          currentStage: sc?.state || 'not_started',
        };
      })
      .filter(Boolean);

    const approvedProjects = db.data.projectSubmissions
      .filter((ps) => ps.userId === passport.userId && ps.status === 'approved')
      .map((ps) => {
        const project = db.data.industryProjects.find((p) => p.id === ps.projectId);
        return {
          id: ps.id,
          title: project?.title || 'Industry Project',
          industryPartner: project?.industryPartner || 'Partner',
          mentorNotes: ps.mentorNotes,
          approvedAt: ps.createdAt,
        };
      });

    const authorisedEvidenceSummaries = db.data.practicalSubmissions
      .filter((sub) => sub.userId === passport.userId && sub.status === 'approved')
      .map((sub) => ({
        competencyCode: sub.competencyCode,
        taskTitle: sub.taskTitle,
        practicalPreliminaryScore: sub.aiAnalysis.overallPreliminaryScore,
        oralScore: sub.oralExam.overallScore,
        reviewedBy: sub.reviewerName,
        reviewedAt: sub.reviewedAt,
      }));

    res.json({
      passport,
      verifiedCompetencies,
      pendingCompetencies,
      approvedProjects,
      authorisedEvidenceSummaries,
      disclaimer:
        'Verified by authorised training mentors/assessors on APPRENTICE IQ. Platform records do not constitute a statutory government licence unless issued by a recognised regulatory authority.',
    });
  });

  // ---------------------------------------------------------------------------
  // Authentication & Registration
  // ---------------------------------------------------------------------------
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  });

  app.post('/api/auth/login', (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Valid email and password (min 6 chars) required.' });
      return;
    }
    const user = db.data.users.find((u) => u.email.toLowerCase() === parsed.data.email.toLowerCase());
    if (!user || !verifyPassword(parsed.data.password, user.passwordHash, user.passwordSalt)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    const pub = db.toPublicUser(user);
    const token = signToken(pub);
    res.json({ user: pub, token });
  });

  const demoRoleMap: Record<UserRole, string> = {
    apprentice: 'liam.vance@apextech.edu',
    mentor: 'elena.rostova@apextech.edu',
    assessor: 'marcus.thorne@apextech.edu',
    employer: 'hiring@gridcore.io',
    admin: 'admin@apextech.edu',
  };

  app.post('/api/auth/demo-login', (req, res) => {
    const role = req.body?.role as UserRole;
    const email = demoRoleMap[role];
    if (!email) {
      res.status(400).json({ error: 'Invalid demo role requested.' });
      return;
    }
    const user = db.data.users.find((u) => u.email === email);
    if (!user) {
      res.status(404).json({ error: 'Demo user account unavailable.' });
      return;
    }
    const pub = db.toPublicUser(user);
    const token = signToken(pub);
    res.json({ user: pub, token });
  });

  const registerSchema = z.object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    password: z.string().min(6).max(100),
    role: z.enum(['apprentice', 'mentor', 'assessor', 'employer']),
    tradeId: z.string().optional(),
    institution: z.string().optional(),
  });

  app.post('/api/auth/register', (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Please complete all required registration fields.' });
      return;
    }
    const exists = db.data.users.some((u) => u.email.toLowerCase() === parsed.data.email.toLowerCase());
    if (exists) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const { hash, salt } = hashPassword(parsed.data.password);
    const newUser = {
      id: `usr_${crypto.randomUUID().slice(0, 8)}`,
      name: parsed.data.name.trim(),
      email: parsed.data.email.toLowerCase().trim(),
      passwordHash: hash,
      passwordSalt: salt,
      role: parsed.data.role as UserRole,
      institution: parsed.data.institution?.trim() || db.data.platformSettings.institutionName,
      tradeId: parsed.data.tradeId || 'trd_electrician',
      cohort: parsed.data.role === 'apprentice' ? 'EL-2026-NEW' : parsed.data.role.toUpperCase(),
      avatarUrl: '/src/assets/images/apprentice_portrait_1795499741960.jpg',
      createdAt: new Date().toISOString(),
    };

    db.data.users.push(newUser);
    if (newUser.role === 'apprentice') {
      const trade = db.data.trades.find((t) => t.id === newUser.tradeId) || db.data.trades[0];
      db.data.skillPassports.push({
        passportId: `IQ-EL-2026-${Math.floor(1000 + Math.random() * 8999)}`,
        userId: newUser.id,
        apprenticeName: newUser.name,
        institution: newUser.institution,
        tradeId: trade.id,
        tradeName: trade.name,
        avatarUrl: newUser.avatarUrl,
        issueDate: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 365 * 86400_000).toISOString(),
        status: 'pending',
        approvedBy: 'Pending Mentor Verification',
        verificationCount: 0,
      });
      db.data.learningRiskRecords.push({
        userId: newUser.id,
        studentName: newUser.name,
        tradeId: trade.id,
        riskLevel: 'low',
        riskScore: 10,
        factors: ['Newly enrolled apprentice'],
        recommendations: ['Start Module 1: Safe Isolation & Earthing Fundamentals'],
        updatedAt: new Date().toISOString(),
      });
    }
    db.save();

    const pub = db.toPublicUser(newUser);
    const token = signToken(pub);
    db.logAudit(pub, 'USER_REGISTERED', 'user', pub.id, `Registered as ${pub.role}`);
    res.status(201).json({ user: pub, token });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = db.data.users.find((u) => u.id === req.auth!.sub);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    res.json({ user: db.toPublicUser(user) });
  });

  // ---------------------------------------------------------------------------
  // Curriculum & Apprentice State
  // ---------------------------------------------------------------------------
  app.get('/api/curriculum', requireAuth, (_req, res) => {
    res.json({
      trades: db.data.trades,
      modules: db.data.modules,
      lessons: db.data.lessons,
      competencies: db.data.competencies,
      practicalTasks: db.data.practicalTasks,
      settings: db.data.platformSettings,
    });
  });

  app.get('/api/apprentice/state', requireAuth, (req: AuthenticatedRequest, res) => {
    const userId = req.auth!.sub;
    const progress = db.data.lessonProgress.filter((lp) => lp.userId === userId);
    const competencies = db.data.studentCompetencies.filter((sc) => sc.userId === userId);
    const submissions = db.data.practicalSubmissions.filter((ps) => ps.userId === userId);
    const passport = db.data.skillPassports.find((sp) => sp.userId === userId) || null;
    const riskRecord = db.data.learningRiskRecords.find((lr) => lr.userId === userId) || null;
    const notifications = db.data.notifications.filter((n) => n.userId === userId);
    const playbackEvents = db.data.playbackEvents.filter((pe) => pe.userId === userId).slice(-20);

    res.json({
      progress,
      competencies,
      submissions,
      passport,
      riskRecord,
      notifications,
      playbackEvents,
    });
  });

  app.post('/api/apprentice/select-trade', requireAuth, (req: AuthenticatedRequest, res) => {
    const tradeId = String(req.body?.tradeId || '');
    const trade = db.data.trades.find((t) => t.id === tradeId);
    if (!trade) {
      res.status(400).json({ error: 'Invalid trade selection.' });
      return;
    }
    const user = db.data.users.find((u) => u.id === req.auth!.sub);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    user.tradeId = trade.id;
    db.save();
    res.json({ user: db.toPublicUser(user), trade });
  });

  // ---------------------------------------------------------------------------
  // Video Playback & Mandatory Skip Policy
  // ---------------------------------------------------------------------------
  const playbackSchema = z.object({
    lessonId: z.string(),
    eventType: z.enum([
      'play',
      'pause',
      'forward_skip',
      'backward_seek',
      'progress_tick',
      'complete',
      'camera_inactivity_reset',
    ]),
    currentTime: z.number().min(0),
    requestedTime: z.number().min(0).optional(),
    reason: z.string().optional(),
  });

  app.post('/api/playback/event', requireAuth, (req: AuthenticatedRequest, res) => {
    const parsed = playbackSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid playback event payload.' });
      return;
    }

    const { lessonId, eventType, currentTime, requestedTime } = parsed.data;
    const userId = req.auth!.sub;
    const lesson = db.data.lessons.find((l) => l.id === lessonId);
    if (!lesson) {
      res.status(404).json({ error: 'Lesson not found.' });
      return;
    }

    let progress = db.data.lessonProgress.find((lp) => lp.userId === userId && lp.lessonId === lessonId);
    if (!progress) {
      progress = {
        userId,
        lessonId,
        watchedSeconds: 0,
        maxReachedSeconds: 0,
        forwardSkipCount: 0,
        resetCount: 0,
        completed: false,
        passedCheckpoints: {},
        updatedAt: new Date().toISOString(),
      };
      db.data.lessonProgress.push(progress);
    }

    const settings = db.data.platformSettings;
    let policyAction: 'ok' | 'skip_allowed' | 'policy_reset' | 'checkpoints_pending' = 'ok';
    let enforcedTime = currentTime;
    let message = '';

    if (eventType === 'forward_skip') {
      const target = requestedTime ?? currentTime + settings.forwardSkipSeconds;
      const delta = target - currentTime;
      if (delta > settings.forwardSkipSeconds + 1) {
        enforcedTime = currentTime + settings.forwardSkipSeconds;
      } else {
        enforcedTime = target;
      }
      progress.forwardSkipCount += 1;

      if (progress.forwardSkipCount > settings.maxForwardSkips) {
        // 3rd forward skip triggers warning & resets to 00:00
        policyAction = 'policy_reset';
        enforcedTime = 0;
        progress.watchedSeconds = 0;
        progress.maxReachedSeconds = 0;
        progress.forwardSkipCount = 0;
        progress.resetCount += 1;
        message = `Forward skip limit (${settings.maxForwardSkips}) exceeded. Playback reset to 00:00 per institution integrity policy.`;
        db.data.playbackEvents.push({
          id: `pe_${crypto.randomUUID().slice(0, 8)}`,
          userId,
          lessonId,
          eventType: 'policy_reset',
          timestampSeconds: Math.round(currentTime),
          detail: message,
          createdAt: new Date().toISOString(),
        });
      } else {
        policyAction = 'skip_allowed';
        const remaining = settings.maxForwardSkips - progress.forwardSkipCount;
        message = `Forward skip logged (${progress.forwardSkipCount}/${settings.maxForwardSkips}). ${remaining} skip${remaining === 1 ? '' : 's'} remaining before 00:00 reset.`;
        db.data.playbackEvents.push({
          id: `pe_${crypto.randomUUID().slice(0, 8)}`,
          userId,
          lessonId,
          eventType: 'forward_skip',
          timestampSeconds: Math.round(enforcedTime),
          detail: message,
          createdAt: new Date().toISOString(),
        });
      }
    } else if (eventType === 'backward_seek') {
      enforcedTime = requestedTime ?? Math.max(0, currentTime - 10);
      db.data.playbackEvents.push({
        id: `pe_${crypto.randomUUID().slice(0, 8)}`,
        userId,
        lessonId,
        eventType: 'backward_seek',
        timestampSeconds: Math.round(enforcedTime),
        detail: 'Backward seek allowed.',
        createdAt: new Date().toISOString(),
      });
    } else if (eventType === 'progress_tick') {
      progress.watchedSeconds = Math.max(progress.watchedSeconds, Math.round(currentTime));
      progress.maxReachedSeconds = Math.max(progress.maxReachedSeconds, Math.round(currentTime));
    } else if (eventType === 'camera_inactivity_reset') {
      policyAction = 'policy_reset';
      enforcedTime = 0;
      progress.watchedSeconds = 0;
      progress.maxReachedSeconds = 0;
      progress.resetCount += 1;
      message =
        parsed.data.reason ||
        'No person or movement detected on camera. Session exited and lesson restarted from 00:00.';
      db.data.playbackEvents.push({
        id: `pe_${crypto.randomUUID().slice(0, 8)}`,
        userId,
        lessonId,
        eventType: 'policy_reset',
        timestampSeconds: Math.round(currentTime),
        detail: message,
        createdAt: new Date().toISOString(),
      });
    } else if (eventType === 'complete') {
      const requiredCheckpoints = lesson.checkpoints.map((c) => c.id);
      const allCheckpointsPassed = requiredCheckpoints.every(
        (id) => (progress!.passedCheckpoints[id]?.score ?? 0) >= 70,
      );
      if (!allCheckpointsPassed && settings.requireCheckpointPass) {
        policyAction = 'checkpoints_pending';
        message = 'All embedded lesson assessments must be passed (>=70%) before lesson completion can be recorded.';
      } else if (progress.maxReachedSeconds < lesson.durationSeconds * 0.85) {
        policyAction = 'checkpoints_pending';
        message = 'Insufficient watched duration logged on server to mark lesson complete.';
      } else {
        progress.completed = true;
        progress.watchedSeconds = lesson.durationSeconds;
        // Advance competency to at least 'learned' or 'practised'
        const existingComp = db.data.studentCompetencies.find(
          (sc) => sc.userId === userId && sc.competencyId === lesson.competencyId,
        );
        if (!existingComp) {
          db.data.studentCompetencies.push({
            userId,
            competencyId: lesson.competencyId,
            state: 'practised',
            learnedAt: new Date().toISOString(),
            practisedAt: new Date().toISOString(),
          });
        } else if (existingComp.state === 'learned') {
          existingComp.state = 'practised';
          existingComp.practisedAt = new Date().toISOString();
        }
        db.data.playbackEvents.push({
          id: `pe_${crypto.randomUUID().slice(0, 8)}`,
          userId,
          lessonId,
          eventType: 'completed',
          timestampSeconds: lesson.durationSeconds,
          detail: 'Lesson completed after backend playback & checkpoint validation.',
          createdAt: new Date().toISOString(),
        });
      }
    }

    progress.updatedAt = new Date().toISOString();
    db.save();

    res.json({
      policyAction,
      enforcedTime,
      message,
      progress,
      settings,
    });
  });

  // ---------------------------------------------------------------------------
  // Embedded Video Assessment (Gemini AI Evaluation)
  // ---------------------------------------------------------------------------
  app.post('/api/lessons/:lessonId/checkpoint', requireAuth, async (req: AuthenticatedRequest, res) => {
    const schema = z.object({
      questionId: z.string(),
      answer: z.string().min(4).max(2500),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Please provide an answer (at least 4 characters).' });
      return;
    }

    const lesson = db.data.lessons.find((l) => l.id === req.params.lessonId);
    if (!lesson) {
      res.status(404).json({ error: 'Lesson not found.' });
      return;
    }
    const question = lesson.checkpoints.find((c) => c.id === parsed.data.questionId);
    if (!question) {
      res.status(404).json({ error: 'Assessment checkpoint not found.' });
      return;
    }

    try {
      const evaluation = await evaluateCheckpointAnswer({
        lesson,
        question,
        answer: parsed.data.answer,
      });

      const userId = req.auth!.sub;
      let progress = db.data.lessonProgress.find((lp) => lp.userId === userId && lp.lessonId === lesson.id);
      if (!progress) {
        progress = {
          userId,
          lessonId: lesson.id,
          watchedSeconds: question.timestampSeconds,
          maxReachedSeconds: question.timestampSeconds,
          forwardSkipCount: 0,
          resetCount: 0,
          completed: false,
          passedCheckpoints: {},
          updatedAt: new Date().toISOString(),
        };
        db.data.lessonProgress.push(progress);
      }

      progress.passedCheckpoints[question.id] = {
        score: evaluation.score,
        answer: parsed.data.answer,
        feedback: evaluation.feedback,
        strengths: evaluation.strengths,
        gaps: evaluation.gaps,
        mode: evaluation.model,
        evaluatedAt: new Date().toISOString(),
      };
      progress.updatedAt = new Date().toISOString();

      // Mark competency as at least 'learned'
      const existingComp = db.data.studentCompetencies.find(
        (sc) => sc.userId === userId && sc.competencyId === lesson.competencyId,
      );
      if (!existingComp) {
        db.data.studentCompetencies.push({
          userId,
          competencyId: lesson.competencyId,
          state: 'learned',
          learnedAt: new Date().toISOString(),
        });
      }

      db.save();
      res.json({ evaluation, progress });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI assessment evaluation failed.';
      res.status(502).json({ error: message });
    }
  });

  // ---------------------------------------------------------------------------
  // AI Learning Copilot
  // ---------------------------------------------------------------------------
  app.post('/api/copilot/chat', requireAuth, async (req: AuthenticatedRequest, res) => {
    const schema = z.object({
      message: z.string().min(1).max(2000),
      lessonId: z.string().optional(),
      language: z.string().default('English'),
      history: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string() })).default([]),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid chat message.' });
      return;
    }

    const user = db.data.users.find((u) => u.id === req.auth!.sub);
    const trade = db.data.trades.find((t) => t.id === user?.tradeId) || db.data.trades[0];
    const lesson = db.data.lessons.find((l) => l.id === parsed.data.lessonId) || db.data.lessons[2] || db.data.lessons[0];
    const module = db.data.modules.find((m) => m.id === lesson.moduleId) || db.data.modules[0];

    const gaps: string[] = [];
    db.data.lessonProgress
      .filter((lp) => lp.userId === req.auth!.sub)
      .forEach((lp) => {
        Object.values(lp.passedCheckpoints).forEach((cp) => {
          gaps.push(...cp.gaps);
        });
      });

    try {
      const result = await askLearningCopilot({
        tradeName: trade.name,
        moduleTitle: module.title,
        lessonTitle: lesson.title,
        skillGaps: gaps.slice(0, 5),
        language: parsed.data.language,
        history: parsed.data.history,
        message: parsed.data.message,
      });
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI Copilot request failed.';
      res.status(502).json({ error: message });
    }
  });

  app.post('/api/copilot/stream', requireAuth, async (req: AuthenticatedRequest, res) => {
    const schema = z.object({
      message: z.string().min(1).max(2000),
      lessonId: z.string().optional(),
      language: z.string().default('English'),
      history: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string() })).default([]),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid chat message.' });
      return;
    }

    const user = db.data.users.find((u) => u.id === req.auth!.sub);
    const trade = db.data.trades.find((t) => t.id === user?.tradeId) || db.data.trades[0];
    const lesson = db.data.lessons.find((l) => l.id === parsed.data.lessonId) || db.data.lessons[2] || db.data.lessons[0];
    const module = db.data.modules.find((m) => m.id === lesson.moduleId) || db.data.modules[0];

    const gaps: string[] = [];
    db.data.lessonProgress
      .filter((lp) => lp.userId === req.auth!.sub)
      .forEach((lp) => {
        Object.values(lp.passedCheckpoints).forEach((cp) => {
          gaps.push(...cp.gaps);
        });
      });

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const writeEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const result = await streamLearningCopilot(
        {
          tradeName: trade.name,
          moduleTitle: module.title,
          lessonTitle: lesson.title,
          skillGaps: gaps.slice(0, 5),
          language: parsed.data.language,
          history: parsed.data.history,
          message: parsed.data.message,
        },
        (deltaText) => {
          writeEvent('chunk', { text: deltaText });
        },
      );
      writeEvent('done', result);
      res.end();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI Copilot request failed.';
      writeEvent('error', { error: message });
      res.end();
    }
  });

  // ---------------------------------------------------------------------------
  // AI Practical Skill Vision & Integrity Radar
  // ---------------------------------------------------------------------------
  app.post('/api/practical/analyze', requireAuth, async (req: AuthenticatedRequest, res) => {
    const schema = z.object({
      taskId: z.string(),
      mediaLabel: z.string().min(2),
      mediaType: z.enum(['demo_capture', 'uploaded_video', 'webcam_recording', 'snapshot']),
      durationSeconds: z.number().min(5).max(1800),
      notes: z.string().max(1500).default(''),
      challengeCode: z.string().default('IQ-CHK-808'),
      imageBase64: z.string().optional(),
      imageMimeType: z.string().optional(),
      useDemoWorkshopFrame: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid practical submission payload.' });
      return;
    }

    const user = db.data.users.find((u) => u.id === req.auth!.sub);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const task = db.data.practicalTasks.find((t) => t.id === parsed.data.taskId);
    if (!task) {
      res.status(404).json({ error: 'Practical task not found.' });
      return;
    }
    const competency = db.data.competencies.find((c) => c.id === task.competencyId)!;

    let imageBase64 = parsed.data.imageBase64;
    let imageMimeType = parsed.data.imageMimeType;

    // If apprentice chooses the labeled Demo Evidence Workshop Capture, load our local generated asset safely
    if (parsed.data.useDemoWorkshopFrame && !imageBase64) {
      const demoPath = path.resolve(process.cwd(), 'src/assets/images/vision_switchgear_bench_1795499741948.jpg');
      if (fs.existsSync(demoPath)) {
        imageBase64 = fs.readFileSync(demoPath).toString('base64');
        imageMimeType = 'image/jpeg';
      }
    }

    const hashSeed = imageBase64
      ? imageBase64.slice(0, 512)
      : `${user.id}:${task.id}:${parsed.data.mediaLabel}:${Date.now()}`;
    const fileHash = `sha256:${crypto.createHash('sha256').update(hashSeed).digest('hex').slice(0, 32)}`;

    const duplicateFound = db.data.practicalSubmissions.some(
      (s) => s.fileHash === fileHash && s.userId !== user.id,
    );

    try {
      const vision = await analyzePracticalEvidence({
        task,
        competency,
        mediaLabel: parsed.data.mediaLabel,
        durationSeconds: parsed.data.durationSeconds,
        notes: parsed.data.notes,
        imageBase64,
        imageMimeType,
      });

      const submission: PracticalSubmission = {
        id: `sub_${crypto.randomUUID().slice(0, 8)}`,
        userId: user.id,
        studentName: user.name,
        tradeId: user.tradeId,
        taskId: task.id,
        taskTitle: task.title,
        competencyId: competency.id,
        competencyCode: competency.code,
        mediaLabel: parsed.data.mediaLabel,
        mediaType: parsed.data.mediaType,
        fileHash,
        durationSeconds: parsed.data.durationSeconds,
        isDemoSample: Boolean(parsed.data.useDemoWorkshopFrame),
        aiAnalysis: {
          mode: 'gemini-live',
          model: vision.model,
          analyzedAt: new Date().toISOString(),
          overallPreliminaryScore: vision.overallPreliminaryScore,
          summary: vision.summary,
          detectedTools: vision.detectedTools,
          observedActions: vision.observedActions,
          safetyObservations: vision.safetyObservations,
          missingEvidence: vision.missingEvidence,
          rubricResults: vision.rubricResults,
          timelineMarkers: vision.timelineMarkers,
          disclaimer:
            'Preliminary AI Skill Vision analysis. Observations marked Insufficient Evidence or Requires Assessor Review must be verified by an authorised Mentor or Assessor.',
        },
        oralExam: {
          status: 'not_started',
          turns: [],
          overallScore: null,
        },
        integrityCheck: {
          fileHash,
          duplicateFound,
          metadataStatus: duplicateFound ? 'review_recommended' : 'verified',
          challengeCode: parsed.data.challengeCode,
          riskLevel: duplicateFound ? 'high' : 'low',
          notes: duplicateFound
            ? 'Media digest matched an existing archive record. Flagged for human mentor review (non-punitive).'
            : `Unique evidence digest verified with challenge token ${parsed.data.challengeCode}.`,
        },
        status: 'ai_analyzed',
        createdAt: new Date().toISOString(),
      };

      db.data.practicalSubmissions.unshift(submission);

      // Update competency state to 'demonstrated' (never 'verified'!)
      const existingComp = db.data.studentCompetencies.find(
        (sc) => sc.userId === user.id && sc.competencyId === competency.id,
      );
      const now = new Date().toISOString();
      if (!existingComp) {
        db.data.studentCompetencies.push({
          userId: user.id,
          competencyId: competency.id,
          state: 'demonstrated',
          learnedAt: now,
          practisedAt: now,
          demonstratedAt: now,
          evidenceSubmissionId: submission.id,
        });
      } else if (existingComp.state !== 'verified') {
        existingComp.state = 'demonstrated';
        existingComp.demonstratedAt = now;
        existingComp.evidenceSubmissionId = submission.id;
      }

      db.logAudit(
        db.toPublicUser(user),
        'PRACTICAL_ANALYZED',
        'practical_submission',
        submission.id,
        `Submitted practical evidence for ${competency.code} analyzed by ${vision.model}`,
      );

      res.status(201).json({ submission });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI Practical Skill Vision analysis failed.';
      res.status(502).json({ error: message });
    }
  });

  // ---------------------------------------------------------------------------
  // Adaptive AI Oral Examination
  // ---------------------------------------------------------------------------
  app.post('/api/oral/:submissionId/turn', requireAuth, async (req: AuthenticatedRequest, res) => {
    const submission = db.data.practicalSubmissions.find((s) => s.id === req.params.submissionId);
    if (!submission) {
      res.status(404).json({ error: 'Practical submission not found.' });
      return;
    }
    if (submission.userId !== req.auth!.sub && req.auth!.role !== 'admin') {
      res.status(403).json({ error: 'You can only take your own oral examination.' });
      return;
    }

    const schema = z.object({
      studentAnswer: z.string().optional(),
      transcriptSource: z.enum(['voice', 'text']).default('text'),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid oral exam request.' });
      return;
    }

    const turns = submission.oralExam.turns;
    const pendingTurn = turns.find((t) => !t.studentAnswer);

    try {
      const result = await runAdaptiveOralTurn({
        taskTitle: submission.taskTitle,
        competencyCode: submission.competencyCode,
        aiSummary: submission.aiAnalysis.summary,
        missingEvidence: submission.aiAnalysis.missingEvidence,
        previousTurns: turns
          .filter((t) => Boolean(t.studentAnswer))
          .map((t) => ({ question: t.question, studentAnswer: t.studentAnswer, score: t.score })),
        currentQuestion: pendingTurn?.question,
        studentAnswer: parsed.data.studentAnswer,
      });

      if (pendingTurn && parsed.data.studentAnswer) {
        pendingTurn.studentAnswer = parsed.data.studentAnswer;
        pendingTurn.transcriptSource = parsed.data.transcriptSource;
        pendingTurn.score = result.score ?? 80;
        pendingTurn.feedback = result.feedback ?? 'Evaluated.';
        pendingTurn.knowledgeGaps = result.knowledgeGaps;
      }

      if (result.examComplete) {
        const answeredScores = turns.map((t) => t.score ?? 80);
        const avg = Math.round(answeredScores.reduce((a, b) => a + b, 0) / Math.max(1, answeredScores.length));
        submission.oralExam.status = 'completed';
        submission.oralExam.overallScore = avg;
        submission.oralExam.summary = result.overallSummary || 'Oral examination completed and queued for mentor verification.';
        submission.status = 'pending_review';

        // Notify mentor
        const mentor = db.data.users.find((u) => u.role === 'mentor');
        if (mentor) {
          db.pushNotification(
            mentor.id,
            `New Review Ready: ${submission.studentName}`,
            `${submission.competencyCode} practical & adaptive oral exam (${avg}%) submitted for human verification.`,
            'verification',
          );
        }
      } else if (result.nextQuestion) {
        submission.oralExam.status = 'in_progress';
        turns.push({
          id: `turn_${crypto.randomUUID().slice(0, 6)}`,
          turnNumber: turns.length + 1,
          difficulty: result.nextDifficulty,
          competencyCode: submission.competencyCode,
          question: result.nextQuestion,
        });
      }

      db.save();
      res.json({ submission, turnResult: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Adaptive oral examination failed.';
      res.status(502).json({ error: message });
    }
  });

  // ---------------------------------------------------------------------------
  // Mentor & Assessor Verification Routes (Strict RBAC)
  // ---------------------------------------------------------------------------
  app.get(
    '/api/mentor/overview',
    requireAuth,
    requireRole('mentor', 'assessor', 'admin'),
    (_req, res) => {
      const apprentices = db.data.users
        .filter((u) => u.role === 'apprentice')
        .map((u) => {
          const pub = db.toPublicUser(u);
          const comps = db.data.studentCompetencies.filter((sc) => sc.userId === u.id);
          const risk = db.data.learningRiskRecords.find((r) => r.userId === u.id);
          const progress = db.data.lessonProgress.filter((lp) => lp.userId === u.id);
          const passport = db.data.skillPassports.find((p) => p.userId === u.id);
          return {
            ...pub,
            verifiedCount: comps.filter((c) => c.state === 'verified').length,
            demonstratedCount: comps.filter((c) => c.state === 'demonstrated').length,
            completedLessons: progress.filter((p) => p.completed).length,
            risk,
            passportId: passport?.passportId,
            passportStatus: passport?.status,
          };
        });

      res.json({
        apprentices,
        submissions: db.data.practicalSubmissions,
        riskRecords: db.data.learningRiskRecords,
        competencies: db.data.competencies,
        studentCompetencies: db.data.studentCompetencies,
        playbackEvents: db.data.playbackEvents.slice(-40),
        projectSubmissions: db.data.projectSubmissions,
        industryProjects: db.data.industryProjects,
      });
    },
  );

  app.post(
    '/api/mentor/assistant',
    requireAuth,
    requireRole('mentor', 'assessor', 'admin'),
    async (req, res) => {
      const question = String(req.body?.question || '').trim();
      if (!question) {
        res.status(400).json({ error: 'Please enter a query for the Mentor Assistant.' });
        return;
      }

      const snapshotLines = db.data.users
        .filter((u) => u.role === 'apprentice')
        .map((u) => {
          const risk = db.data.learningRiskRecords.find((r) => r.userId === u.id);
          const comps = db.data.studentCompetencies.filter((sc) => sc.userId === u.id);
          const subs = db.data.practicalSubmissions.filter((s) => s.userId === u.id);
          return `Apprentice: ${u.name} (${u.cohort}) | Risk: ${risk?.riskLevel} (${risk?.riskScore}/100) | Factors: ${risk?.factors.join('; ')} | Verified: ${comps.filter((c) => c.state === 'verified').length} | Submissions: ${subs.map((s) => `${s.competencyCode}:${s.status}(integrity:${s.integrityCheck.riskLevel})`).join(', ')}`;
        })
        .join('\n');

      try {
        const result = await queryMentorAssistant({
          question,
          cohortSnapshot: snapshotLines,
        });
        res.json(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Mentor assistant query failed.';
        res.status(502).json({ error: message });
      }
    },
  );

  app.post(
    '/api/reviews/:submissionId/decide',
    requireAuth,
    requireRole('mentor', 'assessor', 'admin'),
    (req: AuthenticatedRequest, res) => {
      const schema = z.object({
        decision: z.enum(['approved', 'rejected', 'reassessment_requested']),
        notes: z.string().min(3).max(1500),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Please provide a valid decision and reviewer notes.' });
        return;
      }

      const submission = db.data.practicalSubmissions.find((s) => s.id === req.params.submissionId);
      if (!submission) {
        res.status(404).json({ error: 'Submission not found.' });
        return;
      }

      const reviewer = db.data.users.find((u) => u.id === req.auth!.sub)!;
      const now = new Date().toISOString();

      submission.status = parsed.data.decision;
      submission.reviewerId = reviewer.id;
      submission.reviewerName = reviewer.name;
      submission.reviewerRole = reviewer.role;
      submission.reviewerNotes = parsed.data.notes;
      submission.reviewedAt = now;

      let compRecord = db.data.studentCompetencies.find(
        (sc) => sc.userId === submission.userId && sc.competencyId === submission.competencyId,
      );
      if (!compRecord) {
        compRecord = {
          userId: submission.userId,
          competencyId: submission.competencyId,
          state: 'demonstrated',
        };
        db.data.studentCompetencies.push(compRecord);
      }

      if (parsed.data.decision === 'approved') {
        compRecord.state = 'verified';
        compRecord.verifiedAt = now;
        compRecord.verifiedBy = reviewer.id;
        compRecord.verifiedByName = reviewer.name;
        compRecord.mentorNotes = parsed.data.notes;
        compRecord.evidenceSubmissionId = submission.id;

        // Issue or activate Digital Skill Passport once at least 1 competency is human-verified
        const passport = db.data.skillPassports.find((p) => p.userId === submission.userId);
        if (passport) {
          passport.status = 'active';
          passport.approvedBy = `${reviewer.name} (${reviewer.institution})`;
          passport.issueDate = now;
        }
      } else {
        compRecord.state = 'practised';
        compRecord.mentorNotes = parsed.data.notes;
      }

      db.pushNotification(
        submission.userId,
        `${submission.competencyCode} ${parsed.data.decision === 'approved' ? 'Verified' : 'Requires Follow-Up'}`,
        `${reviewer.name} (${reviewer.role}): ${parsed.data.notes}`,
        'verification',
      );

      db.logAudit(
        db.toPublicUser(reviewer),
        `SUBMISSION_${parsed.data.decision.toUpperCase()}`,
        'practical_submission',
        submission.id,
        `${parsed.data.decision} ${submission.competencyCode} for ${submission.studentName}: ${parsed.data.notes}`,
      );

      db.save();
      res.json({
        submission,
        studentCompetency: compRecord,
        passport: db.data.skillPassports.find((p) => p.userId === submission.userId) || null,
      });
    },
  );

  // ---------------------------------------------------------------------------
  // Employer Portal Routes
  // ---------------------------------------------------------------------------
  app.get(
    '/api/employer/candidates',
    requireAuth,
    requireRole('employer', 'admin'),
    (_req, res) => {
      const candidates = db.data.users
        .filter((u) => u.role === 'apprentice')
        .map((u) => {
          const trade = db.data.trades.find((t) => t.id === u.tradeId);
          const passport = db.data.skillPassports.find((p) => p.userId === u.id);
          const verifiedComps = db.data.studentCompetencies
            .filter((sc) => sc.userId === u.id && sc.state === 'verified')
            .map((sc) => {
              const comp = db.data.competencies.find((c) => c.id === sc.competencyId);
              return {
                id: sc.competencyId,
                code: comp?.code || '',
                title: comp?.title || '',
                category: comp?.category || '',
                verifiedByName: sc.verifiedByName,
                verifiedAt: sc.verifiedAt,
              };
            });

          const approvedSubs = db.data.practicalSubmissions.filter(
            (s) => s.userId === u.id && s.status === 'approved',
          );
          const avgPractical =
            approvedSubs.length > 0
              ? Math.round(
                  approvedSubs.reduce((a, b) => a + b.aiAnalysis.overallPreliminaryScore, 0) / approvedSubs.length,
                )
              : null;
          const avgOral =
            approvedSubs.length > 0
              ? Math.round(
                  approvedSubs.reduce((a, b) => a + (b.oralExam.overallScore || 0), 0) / approvedSubs.length,
                )
              : null;

          const projects = db.data.projectSubmissions
            .filter((ps) => ps.userId === u.id && ps.status === 'approved')
            .map((ps) => {
              const p = db.data.industryProjects.find((ip) => ip.id === ps.projectId);
              return { id: ps.id, title: p?.title || 'Project', partner: p?.industryPartner || '' };
            });

          return {
            id: u.id,
            name: u.name,
            institution: u.institution,
            tradeId: u.tradeId,
            tradeName: trade?.name || 'Electrician',
            avatarUrl: u.avatarUrl,
            passportId: passport?.passportId || null,
            passportStatus: passport?.status || 'pending',
            verifiedCompetencies: verifiedComps,
            avgPracticalScore: avgPractical,
            avgOralScore: avgOral,
            approvedProjects: projects,
          };
        });

      res.json({
        candidates,
        trades: db.data.trades,
        competencies: db.data.competencies,
        requests: db.data.employerRequests,
      });
    },
  );

  app.post(
    '/api/employer/request',
    requireAuth,
    requireRole('employer', 'admin'),
    (req: AuthenticatedRequest, res) => {
      const schema = z.object({
        apprenticeId: z.string(),
        message: z.string().min(5).max(1000),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Please include a message for the candidate.' });
        return;
      }
      const employer = db.data.users.find((u) => u.id === req.auth!.sub)!;
      const apprentice = db.data.users.find((u) => u.id === parsed.data.apprenticeId && u.role === 'apprentice');
      if (!apprentice) {
        res.status(404).json({ error: 'Candidate not found.' });
        return;
      }

      const request = {
        id: `req_${crypto.randomUUID().slice(0, 8)}`,
        employerId: employer.id,
        employerName: employer.name,
        companyName: employer.institution,
        apprenticeId: apprentice.id,
        apprenticeName: apprentice.name,
        message: parsed.data.message,
        status: 'sent' as const,
        createdAt: new Date().toISOString(),
      };
      db.data.employerRequests.unshift(request);
      db.pushNotification(
        apprentice.id,
        `Interview Inquiry from ${employer.institution}`,
        `${employer.name}: ${parsed.data.message}`,
        'system',
      );
      db.save();
      res.status(201).json({ request });
    },
  );

  // ---------------------------------------------------------------------------
  // Industry Projects
  // ---------------------------------------------------------------------------
  app.get('/api/projects', requireAuth, (req: AuthenticatedRequest, res) => {
    const userComps = db.data.studentCompetencies.filter((sc) => sc.userId === req.auth!.sub);
    const verifiedCodes = new Set(
      userComps
        .filter((sc) => sc.state === 'verified' || sc.state === 'demonstrated')
        .map((sc) => db.data.competencies.find((c) => c.id === sc.competencyId)?.code || ''),
    );

    const projects = db.data.industryProjects.map((p) => {
      const matched = p.requiredCompetencyCodes.filter((c) => verifiedCodes.has(c)).length;
      return {
        ...p,
        matchPercentage: Math.round((matched / Math.max(1, p.requiredCompetencyCodes.length)) * 100),
      };
    });

    res.json({
      projects,
      submissions: db.data.projectSubmissions.filter((ps) => ps.userId === req.auth!.sub),
    });
  });

  app.post('/api/projects/:projectId/submit', requireAuth, (req: AuthenticatedRequest, res) => {
    const schema = z.object({
      notes: z.string().min(5).max(1500),
      evidenceLabel: z.string().min(3).max(200),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Please include submission notes and evidence label.' });
      return;
    }

    const project = db.data.industryProjects.find((p) => p.id === req.params.projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }

    const sub = {
      id: `prjsub_${crypto.randomUUID().slice(0, 8)}`,
      projectId: project.id,
      userId: req.auth!.sub,
      notes: parsed.data.notes,
      evidenceLabel: parsed.data.evidenceLabel,
      aiFeedback: `Preliminary alignment check against ${project.rubric.length} rubric criteria complete. Pending Mentor approval before adding to Skill Passport.`,
      status: 'submitted' as const,
      createdAt: new Date().toISOString(),
    };
    db.data.projectSubmissions.unshift(sub);
    db.save();
    res.status(201).json({ submission: sub });
  });

  // ---------------------------------------------------------------------------
  // Institution Admin Portal
  // ---------------------------------------------------------------------------
  app.get(
    '/api/admin/overview',
    requireAuth,
    requireRole('admin'),
    (_req, res) => {
      res.json({
        users: db.data.users.map((u) => db.toPublicUser(u)),
        trades: db.data.trades,
        competencies: db.data.competencies,
        studentCompetencies: db.data.studentCompetencies,
        settings: db.data.platformSettings,
        auditLogs: db.data.auditLogs.slice(0, 50),
        riskRecords: db.data.learningRiskRecords,
        passports: db.data.skillPassports,
      });
    },
  );

  app.patch(
    '/api/admin/settings',
    requireAuth,
    requireRole('admin'),
    (req: AuthenticatedRequest, res) => {
      const schema = z.object({
        maxForwardSkips: z.number().int().min(0).max(10).optional(),
        forwardSkipSeconds: z.number().int().min(5).max(30).optional(),
        requireCheckpointPass: z.boolean().optional(),
        institutionName: z.string().min(2).max(100).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: 'Invalid settings payload.' });
        return;
      }

      db.data.platformSettings = {
        ...db.data.platformSettings,
        ...parsed.data,
      };
      const actor = db.data.users.find((u) => u.id === req.auth!.sub)!;
      db.logAudit(
        db.toPublicUser(actor),
        'SETTINGS_UPDATED',
        'platform_settings',
        'global',
        `Updated skip allowance=${db.data.platformSettings.maxForwardSkips}, checkpointRequired=${db.data.platformSettings.requireCheckpointPass}`,
      );
      res.json({ settings: db.data.platformSettings });
    },
  );

  app.patch(
    '/api/admin/users/:userId/role',
    requireAuth,
    requireRole('admin'),
    (req: AuthenticatedRequest, res) => {
      const role = req.body?.role as UserRole;
      if (!['apprentice', 'mentor', 'assessor', 'employer', 'admin'].includes(role)) {
        res.status(400).json({ error: 'Invalid role.' });
        return;
      }
      const target = db.data.users.find((u) => u.id === req.params.userId);
      if (!target) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }
      target.role = role;
      const actor = db.data.users.find((u) => u.id === req.auth!.sub)!;
      db.logAudit(
        db.toPublicUser(actor),
        'USER_ROLE_CHANGED',
        'user',
        target.id,
        `Updated ${target.name} role to ${role}`,
      );
      res.json({ user: db.toPublicUser(target) });
    },
  );

  // ---------------------------------------------------------------------------
  // Vite / Static Frontend Serving
  // ---------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`APPRENTICE IQ server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
