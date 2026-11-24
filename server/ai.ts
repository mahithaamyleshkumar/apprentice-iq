import { GoogleGenAI, Type, ThinkingLevel, type Content } from '@google/genai';
import type { Competency, Lesson, LessonQuestion, PracticalTask } from '../src/types.ts';

const PRIMARY_MODEL = 'gemini-4-hydrogen';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured. Please add your key in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseFriendlyAiError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || 'Unknown AI service error');
  try {
    const parsed = JSON.parse(raw);
    const msg = parsed?.error?.message || parsed?.message;
    const code = parsed?.error?.code || parsed?.code;
    if (code === 403 || code === 400 || String(msg).includes('API_KEY')) {
      return 'Gemini API key error. Please check your GEMINI_API_KEY in Settings > Secrets.';
    }
    if (code === 429 || String(msg).includes('RESOURCE_EXHAUSTED')) {
      return 'Gemini API quota temporarily reached. Please wait a moment and retry, or select a billing-enabled key in Settings > Secrets.';
    }
    if (code === 503 || String(msg).includes('high demand') || String(msg).includes('UNAVAILABLE')) {
      return 'Gemini AI is experiencing high demand right now. Please try again in a few seconds.';
    }
    if (msg) return String(msg);
  } catch {
    // Non-JSON error string
  }
  if (raw.includes('API_KEY_INVALID') || raw.includes('PERMISSION_DENIED')) {
    return 'Gemini API key permission error. Please check your GEMINI_API_KEY in Settings > Secrets.';
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return 'Gemini API quota temporarily reached. Please wait a moment and retry, or select a billing-enabled key in Settings > Secrets.';
  }
  if (raw.includes('503') || raw.includes('UNAVAILABLE') || raw.includes('high demand')) {
    return 'Gemini AI is temporarily busy due to high demand. Please retry in a moment.';
  }
  return raw;
}

function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || '');
  return (
    msg.includes('503') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('500') ||
    msg.includes('INTERNAL') ||
    msg.includes('high demand') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('fetch failed')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`503 Timed out waiting for ${label}`));
    }, ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function runWithGeminiFallback<T>(
  taskFn: (model: string, ai: GoogleGenAI) => Promise<T>,
  perAttemptTimeoutMs = 15000,
): Promise<{ result: T; model: string }> {
  const ai = getAiClient();
  const attempts: { model: string; delayMs: number }[] = [
    { model: PRIMARY_MODEL, delayMs: 0 },
    { model: FALLBACK_MODEL, delayMs: 1000 },
    { model: PRIMARY_MODEL, delayMs: 2000 },
  ];

  let lastError: unknown;
  for (let i = 0; i < attempts.length; i++) {
    const { model, delayMs } = attempts[i];
    if (delayMs > 0) await sleep(delayMs);
    try {
      const result = await withTimeout(taskFn(model, ai), perAttemptTimeoutMs, model);
      return { result, model };
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Gemini] Attempt ${i + 1} (${model}) failed: ${msg.slice(0, 180)}`);
      const isQuotaError = msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED');
      if (isQuotaError && i >= 1) {
        break;
      }
      if (!isTransientError(err) && !msg.includes('404')) {
        break;
      }
    }
  }

  throw new Error(parseFriendlyAiError(lastError));
}

function safeParseJson<T>(rawText: string | undefined): T {
  const cleaned = (rawText ?? '{}')
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned) as T;
}

function modelThinkingConfig(model: string) {
  return model === PRIMARY_MODEL ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {};
}

function buildNormalizedChatHistory(
  history: { role: 'user' | 'assistant'; text: string }[],
  currentMessage: string,
): Content[] {
  const trimmedCurrent = currentMessage.trim();
  const items = [...history];

  // Remove trailing duplicate if caller already appended currentMessage to history
  if (
    items.length > 0 &&
    items[items.length - 1].role === 'user' &&
    items[items.length - 1].text.trim() === trimmedCurrent
  ) {
    items.pop();
  }

  // Gemini chat history should begin with a user turn
  const firstUserIdx = items.findIndex((m) => m.role === 'user' && m.text.trim().length > 0);
  if (firstUserIdx === -1) return [];

  const sliced = items.slice(firstUserIdx).slice(-8);
  const contents: Content[] = [];
  for (const item of sliced) {
    const text = item.text.trim();
    if (!text) continue;
    const role: 'user' | 'model' = item.role === 'user' ? 'user' : 'model';
    const prev = contents[contents.length - 1];
    if (prev && prev.role === role) {
      prev.parts = [{ text: `${prev.parts?.[0]?.text ?? ''}\n\n${text}` }];
    } else {
      contents.push({ role, parts: [{ text }] });
    }
  }

  // Ensure history ends on a 'model' turn so the upcoming sendMessage('user') alternates cleanly
  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    contents.pop();
  }
  return contents;
}

function extractReplyAndFollowUps(
  rawText: string,
  lessonTitle: string,
): { reply: string; suggestedFollowUps: string[] } {
  const markerRegex = /\n+(?:---\s*\n+)?FOLLOW_UPS:\s*\n([\s\S]*)$/i;
  const match = rawText.match(markerRegex);
  if (!match) {
    return {
      reply: rawText.trim(),
      suggestedFollowUps: [
        `Give me a quick practice check on ${lessonTitle}.`,
        'What common workshop mistakes should I avoid here?',
      ],
    };
  }

  const reply = rawText.slice(0, match.index).trim();
  const lines = match[1]
    .split('\n')
    .map((l) => l.replace(/^[-*\d.)\s]+/, '').trim())
    .filter((l) => l.length > 4)
    .slice(0, 3);

  return {
    reply: reply || rawText.trim(),
    suggestedFollowUps:
      lines.length > 0
        ? lines
        : [
            `Give me a quick practice check on ${lessonTitle}.`,
            'What common workshop mistakes should I avoid here?',
          ],
  };
}

function buildCopilotSystemInstruction(params: {
  tradeName: string;
  moduleTitle: string;
  lessonTitle: string;
  skillGaps: string[];
  language: string;
}): string {
  return `You are the APPRENTICE IQ AI Learning Copilot, a supportive and expert vocational instructor for ${params.tradeName}.
Active Module: ${params.moduleTitle}
Active Lesson: ${params.lessonTitle}
Known Student Skill Gaps: ${params.skillGaps.length ? params.skillGaps.join(', ') : 'None flagged yet'}

Response rules:
- Always answer the learner's question directly, accurately, and clearly in ${params.language}.
- Use clear short paragraphs, numbered steps or bullet points for procedures, and practical workshop analogies.
- When safety, isolation, testing, or standards are relevant, highlight critical safety rules clearly.
- Keep answers focused, concise (around 120-180 words unless a step-by-step procedure requires more), and easy to read. Remind briefly when relevant that Copilot study guidance does not replace official Mentor/Assessor sign-off.
- At the very end of your response, add a section formatted exactly like this with 2 or 3 short follow-up questions in ${params.language}:

FOLLOW_UPS:
- Question 1
- Question 2`;
}

export async function evaluateCheckpointAnswer(params: {
  lesson: Lesson;
  question: LessonQuestion;
  answer: string;
}): Promise<{
  score: number;
  passed: boolean;
  feedback: string;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  model: string;
}> {
  const { result, model } = await runWithGeminiFallback(async (activeModel, ai) => {
    const response = await ai.models.generateContent({
      model: activeModel,
      contents: `Evaluate this vocational apprentice's checkpoint answer.
Lesson: ${params.lesson.title} (${params.lesson.summary})
Competency: ${params.question.competencyCode}
Question: ${params.question.prompt}
Expected Technical Concepts: ${params.question.expectedConcepts.join(', ')}
Apprentice Answer: "${params.answer}"

Evaluate technical accuracy, conceptual understanding, terminology, and safety reasoning. Do not use exact keyword matching alone. Be fair, concise, and constructive.`,
      config: {
        systemInstruction:
          'You are a senior vocational electrical engineering examiner for APPRENTICE IQ. Return strictly calibrated JSON matching the schema.',
        ...modelThinkingConfig(activeModel),
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER, description: '0 to 100 score' },
            passed: { type: Type.BOOLEAN, description: 'True if score >= 70 and core safety concept understood' },
            feedback: { type: Type.STRING, description: '2-3 sentence constructive evaluation' },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['score', 'passed', 'feedback', 'strengths', 'gaps', 'recommendations'],
        },
      },
    });
    return safeParseJson<{
      score: number;
      passed: boolean;
      feedback: string;
      strengths: string[];
      gaps: string[];
      recommendations: string[];
    }>(response.text);
  });

  return { ...result, model };
}

export async function askLearningCopilot(params: {
  tradeName: string;
  moduleTitle: string;
  lessonTitle: string;
  skillGaps: string[];
  language: string;
  history: { role: 'user' | 'assistant'; text: string }[];
  message: string;
}): Promise<{ reply: string; suggestedFollowUps: string[]; model: string }> {
  const history = buildNormalizedChatHistory(params.history, params.message);
  const systemInstruction = buildCopilotSystemInstruction(params);
  const contents: Content[] = [...history, { role: 'user', parts: [{ text: params.message }] }];

  const { result, model } = await runWithGeminiFallback(async (activeModel, ai) => {
    const response = await ai.models.generateContent({
      model: activeModel,
      contents,
      config: {
        systemInstruction,
        ...modelThinkingConfig(activeModel),
      },
    });
    const text = (response.text ?? '').trim();
    if (!text) {
      throw new Error('503 Empty response from Gemini model.');
    }
    return extractReplyAndFollowUps(text, params.lessonTitle);
  });

  return { ...result, model };
}

export async function streamLearningCopilot(
  params: {
    tradeName: string;
    moduleTitle: string;
    lessonTitle: string;
    skillGaps: string[];
    language: string;
    history: { role: 'user' | 'assistant'; text: string }[];
    message: string;
  },
  onChunk: (deltaText: string) => void,
): Promise<{ reply: string; suggestedFollowUps: string[]; model: string }> {
  const history = buildNormalizedChatHistory(params.history, params.message);
  const systemInstruction = buildCopilotSystemInstruction(params);
  const contents: Content[] = [...history, { role: 'user', parts: [{ text: params.message }] }];

  let emittedAny = false;
  const { result, model } = await runWithGeminiFallback(async (activeModel, ai) => {
    const stream = await ai.models.generateContentStream({
      model: activeModel,
      contents,
      config: {
        systemInstruction,
        ...modelThinkingConfig(activeModel),
      },
    });
    let accumulated = '';
    for await (const chunk of stream) {
      const piece = chunk.text ?? '';
      if (piece) {
        accumulated += piece;
        emittedAny = true;
        onChunk(piece);
      }
    }
    if (!accumulated.trim()) {
      if (emittedAny) {
        throw new Error('Stream interrupted before completing.');
      }
      throw new Error('503 Empty response stream from Gemini model.');
    }
    return extractReplyAndFollowUps(accumulated, params.lessonTitle);
  }, 15000);

  return { ...result, model };
}

export async function analyzePracticalEvidence(params: {
  task: PracticalTask;
  competency: Competency;
  mediaLabel: string;
  durationSeconds: number;
  notes: string;
  imageBase64?: string;
  imageMimeType?: string;
}): Promise<{
  overallPreliminaryScore: number;
  summary: string;
  detectedTools: string[];
  observedActions: string[];
  safetyObservations: string[];
  missingEvidence: string[];
  rubricResults: { criterion: string; status: 'observed' | 'partial' | 'insufficient_evidence'; notes: string }[];
  timelineMarkers: {
    timestampSeconds: number;
    label: string;
    category: 'tool' | 'action' | 'safety' | 'insufficient';
    observation: string;
    confidence: 'high' | 'medium' | 'insufficient_evidence';
  }[];
  model: string;
}> {
  const textPrompt = `Perform an honest, evidence-grounded AI Practical Skill Vision analysis for this vocational task.
Task: ${params.task.title}
Competency: ${params.competency.code} — ${params.competency.title}
Description: ${params.task.description}
Required Tools: ${params.task.requiredTools.join(', ')}
Safety Guidelines: ${params.task.safetyGuidelines.join(' | ')}
Rubric Criteria: ${params.task.rubric.map((r) => r.criterion).join(' | ')}
Submitted Media Label: ${params.mediaLabel}
Duration: ${params.durationSeconds} seconds
Apprentice Bench Notes: ${params.notes || 'None provided'}

CRITICAL EVIDENCE RULE: Never invent visual observations. If an image is provided, report ONLY what is genuinely visible in the frame and explicitly mark anything unseen or blocked (such as dynamic actions, torque settings, or PPE outside frame) as "Insufficient Evidence" or "Requires Assessor Review". If no image frame is attached, state explicitly in missingEvidence that visual frame inspection requires assessor playback review.`;

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  if (params.imageBase64 && params.imageMimeType) {
    parts.push({
      inlineData: {
        mimeType: params.imageMimeType,
        data: params.imageBase64,
      },
    });
  }
  parts.push({ text: textPrompt });

  const { result, model } = await runWithGeminiFallback(async (activeModel, ai) => {
    const response = await ai.models.generateContent({
      model: activeModel,
      contents: { parts },
      config: {
        systemInstruction:
          'You are the APPRENTICE IQ Practical Skill Vision analyzer. Output strictly truthful, non-hallucinated observations and preliminary rubric mapping. Mark unseen criteria as insufficient_evidence.',
        ...modelThinkingConfig(activeModel),
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallPreliminaryScore: { type: Type.INTEGER },
            summary: { type: Type.STRING },
            detectedTools: { type: Type.ARRAY, items: { type: Type.STRING } },
            observedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
            safetyObservations: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingEvidence: { type: Type.ARRAY, items: { type: Type.STRING } },
            rubricResults: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  criterion: { type: Type.STRING },
                  status: { type: Type.STRING, description: 'observed | partial | insufficient_evidence' },
                  notes: { type: Type.STRING },
                },
                required: ['criterion', 'status', 'notes'],
              },
            },
            timelineMarkers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timestampSeconds: { type: Type.INTEGER },
                  label: { type: Type.STRING },
                  category: { type: Type.STRING, description: 'tool | action | safety | insufficient' },
                  observation: { type: Type.STRING },
                  confidence: { type: Type.STRING, description: 'high | medium | insufficient_evidence' },
                },
                required: ['timestampSeconds', 'label', 'category', 'observation', 'confidence'],
              },
            },
          },
          required: [
            'overallPreliminaryScore',
            'summary',
            'detectedTools',
            'observedActions',
            'safetyObservations',
            'missingEvidence',
            'rubricResults',
            'timelineMarkers',
          ],
        },
      },
    });

    return safeParseJson<{
      overallPreliminaryScore: number;
      summary: string;
      detectedTools: string[];
      observedActions: string[];
      safetyObservations: string[];
      missingEvidence: string[];
      rubricResults: { criterion: string; status: 'observed' | 'partial' | 'insufficient_evidence'; notes: string }[];
      timelineMarkers: {
        timestampSeconds: number;
        label: string;
        category: 'tool' | 'action' | 'safety' | 'insufficient';
        observation: string;
        confidence: 'high' | 'medium' | 'insufficient_evidence';
      }[];
    }>(response.text);
  });

  return { ...result, model };
}

export async function runAdaptiveOralTurn(params: {
  taskTitle: string;
  competencyCode: string;
  aiSummary: string;
  missingEvidence: string[];
  previousTurns: { question: string; studentAnswer?: string; score?: number }[];
  currentQuestion?: string;
  studentAnswer?: string;
}): Promise<{
  score: number | null;
  feedback: string | null;
  knowledgeGaps: string[];
  nextQuestion: string | null;
  nextDifficulty: 'foundational' | 'applied' | 'diagnostic';
  examComplete: boolean;
  overallSummary: string | null;
  model: string;
}> {
  const isStarting = !params.currentQuestion || !params.studentAnswer;
  const turnCount = params.previousTurns.length;

  const { result, model } = await runWithGeminiFallback(async (activeModel, ai) => {
    const response = await ai.models.generateContent({
      model: activeModel,
      contents: `Practical Task: ${params.taskTitle} (${params.competencyCode})
AI Practical Observation Summary: ${params.aiSummary}
Flagged Missing Evidence: ${params.missingEvidence.join('; ') || 'None'}
Completed Turns (${turnCount}): ${JSON.stringify(params.previousTurns)}
${
  isStarting
    ? 'Generate Question 1 (foundational/applied) specifically grounded in the practical task and any missing evidence.'
    : `Evaluate the student's answer to Question ${turnCount + 1}:
Question: "${params.currentQuestion}"
Student Answer: "${params.studentAnswer}"
If total answered turns is now >= 3, conclude the oral exam (examComplete: true, nextQuestion: null) and write an overallSummary. Otherwise generate an adaptive follow-up question tailored to their answer and difficulty progression.`
}`,
      config: {
        systemInstruction:
          'You are the Adaptive AI Oral Examiner for APPRENTICE IQ. Ask razor-sharp vocational trade questions adapted to the demonstration and prior answer. Never rely on exact keyword matching.',
        ...modelThinkingConfig(activeModel),
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER, nullable: true },
            feedback: { type: Type.STRING, nullable: true },
            knowledgeGaps: { type: Type.ARRAY, items: { type: Type.STRING } },
            nextQuestion: { type: Type.STRING, nullable: true },
            nextDifficulty: { type: Type.STRING, description: 'foundational | applied | diagnostic' },
            examComplete: { type: Type.BOOLEAN },
            overallSummary: { type: Type.STRING, nullable: true },
          },
          required: ['knowledgeGaps', 'nextDifficulty', 'examComplete'],
        },
      },
    });

    return safeParseJson<{
      score?: number | null;
      feedback?: string | null;
      knowledgeGaps?: string[];
      nextQuestion?: string | null;
      nextDifficulty?: 'foundational' | 'applied' | 'diagnostic';
      examComplete?: boolean;
      overallSummary?: string | null;
    }>(response.text);
  });

  return {
    score: result.score ?? null,
    feedback: result.feedback ?? null,
    knowledgeGaps: result.knowledgeGaps ?? [],
    nextQuestion: result.nextQuestion ?? null,
    nextDifficulty: result.nextDifficulty || 'applied',
    examComplete: Boolean(result.examComplete),
    overallSummary: result.overallSummary ?? null,
    model,
  };
}

export async function queryMentorAssistant(params: {
  question: string;
  cohortSnapshot: string;
}): Promise<{ answer: string; citedApprentices: string[]; recommendedActions: string[]; model: string }> {
  const { result, model } = await runWithGeminiFallback(async (activeModel, ai) => {
    const response = await ai.models.generateContent({
      model: activeModel,
      contents: `Authorised Cohort Records:
${params.cohortSnapshot}

Mentor Query: "${params.question}"

Answer strictly using the authorised platform records provided above. Cite exact apprentice names, competency codes, risk scores, and submission statuses.`,
      config: {
        systemInstruction:
          'You are the APPRENTICE IQ Mentor Command Assistant. Provide concise, evidence-cited operational answers strictly grounded in the provided cohort data.',
        ...modelThinkingConfig(activeModel),
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: { type: Type.STRING },
            citedApprentices: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['answer', 'citedApprentices', 'recommendedActions'],
        },
      },
    });

    return safeParseJson<{
      answer: string;
      citedApprentices: string[];
      recommendedActions: string[];
    }>(response.text);
  });

  return { ...result, model };
}
