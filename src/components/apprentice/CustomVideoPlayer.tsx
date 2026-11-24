import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FastForward,
  Info,
  Maximize2,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Send,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { CameraPresenceMonitor, type InactivityReason } from '../camera/CameraPresenceMonitor.tsx';
import type { Lesson, LessonProgress, LessonQuestion, PlatformSettings } from '../../types.ts';

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const CustomVideoPlayer: React.FC<{
  lesson: Lesson;
  progress: LessonProgress | undefined;
  settings: PlatformSettings;
  onRefresh: () => void;
}> = ({ lesson, progress, settings, onRefresh }) => {
  const { apiFetch, addToast, navigate } = useApp();

  const [currentTime, setCurrentTime] = useState<number>(progress?.watchedSeconds && !progress.completed ? Math.min(progress.watchedSeconds, lesson.durationSeconds - 5) : 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  const [forwardSkips, setForwardSkips] = useState(progress?.forwardSkipCount ?? 0);
  const [policyWarning, setPolicyWarning] = useState<string>('');
  const [activeCheckpoint, setActiveCheckpoint] = useState<LessonQuestion | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [lastEvaluation, setLastEvaluation] = useState<{
    score: number;
    passed: boolean;
    feedback: string;
    strengths: string[];
    gaps: string[];
    model: string;
  } | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recognitionRef = useRef<unknown>(null);

  const [cameraGuardEnabled, setCameraGuardEnabled] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraEnrolled, setCameraEnrolled] = useState(false);

  const handleCameraInactivity = async (reason: InactivityReason) => {
    const reasonText =
      reason === 'no_person'
        ? 'No person detected on camera for 10s. Lesson playback exited and restarted from 00:00.'
        : reason === 'no_movement'
        ? 'No movement detected on camera for 10s. Lesson playback exited and restarted from 00:00.'
        : 'Camera video feed lost. Lesson playback exited and restarted from 00:00.';

    setIsPlaying(false);
    setCurrentTime(0);
    setPolicyWarning(reasonText);
    addToast({
      title: 'Session Reset to 00:00',
      message: reasonText,
      variant: 'warning',
    });

    await apiFetch('/api/playback/event', {
      method: 'POST',
      body: JSON.stringify({
        lessonId: lesson.id,
        eventType: 'camera_inactivity_reset',
        currentTime,
        reason: reasonText,
      }),
    })
      .then(() => onRefresh())
      .catch(() => undefined);
  };

  // Sync progress ticker
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const next = Math.min(lesson.durationSeconds, prev + 0.5 * speed);

        // Check if we crossed an unpassed checkpoint
        const hit = lesson.checkpoints.find((cp) => {
          const passed = (progress?.passedCheckpoints?.[cp.id]?.score ?? 0) >= 70;
          return !passed && prev < cp.timestampSeconds && next >= cp.timestampSeconds;
        });
        if (hit) {
          setIsPlaying(false);
          setActiveCheckpoint(hit);
          setLastEvaluation(null);
          return hit.timestampSeconds;
        }

        if (next >= lesson.durationSeconds) {
          setIsPlaying(false);
          apiFetch('/api/playback/event', {
            method: 'POST',
            body: JSON.stringify({
              lessonId: lesson.id,
              eventType: 'progress_tick',
              currentTime: lesson.durationSeconds,
            }),
          }).then(() => onRefresh()).catch(() => undefined);
        }
        return next;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, speed, lesson, progress, apiFetch, onRefresh]);

  // Periodically send watched progress to backend every 5s
  useEffect(() => {
    if (!isPlaying) return;
    const syncTimer = setInterval(() => {
      apiFetch('/api/playback/event', {
        method: 'POST',
        body: JSON.stringify({
          lessonId: lesson.id,
          eventType: 'progress_tick',
          currentTime,
        }),
      }).catch(() => undefined);
    }, 4000);
    return () => clearInterval(syncTimer);
  }, [isPlaying, currentTime, lesson.id, apiFetch]);

  // Animated Technical Workbench Simulation Canvas synced to currentTime
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Midnight Navy background
    ctx.fillStyle = '#080D19';
    ctx.fillRect(0, 0, w, h);

    // Subtle schematic grid
    ctx.strokeStyle = 'rgba(57, 217, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const pct = currentTime / lesson.durationSeconds;

    // Distribution Board Housing
    ctx.strokeStyle = '#334155';
    ctx.fillStyle = '#0E1628';
    ctx.lineWidth = 2;
    ctx.fillRect(70, 56, 460, 230);
    ctx.strokeRect(70, 56, 460, 230);

    // Copper busbar
    ctx.fillStyle = '#D97706';
    ctx.fillRect(96, 82, 408, 10);

    // DIN Rail & 4 Switchgear Modules
    const modules = ['40A MAIN', '30mA RCCB', 'B16 MCB', 'C20 MCB'];
    modules.forEach((label, idx) => {
      const mx = 104 + idx * 102;
      const energized = pct > 0.15 + idx * 0.15;
      ctx.fillStyle = '#131F35';
      ctx.strokeStyle = energized ? '#39D9FF' : '#475569';
      ctx.lineWidth = 1.5;
      ctx.fillRect(mx, 118, 84, 110);
      ctx.strokeRect(mx, 118, 84, 110);

      // Breaker toggle
      ctx.fillStyle = energized ? '#10B981' : '#EF4444';
      ctx.fillRect(mx + 22, energized ? 162 : 178, 40, 14);

      ctx.fillStyle = '#F4F7FC';
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillText(label, mx + 8, 140);
    });

    // Animated signal pulse along conductor
    const pulseX = 96 + ((currentTime * 75) % 408);
    ctx.beginPath();
    ctx.arc(pulseX, 87, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#39D9FF';
    ctx.fill();

    // Digital Multimeter Telemetry Overlay on right
    ctx.fillStyle = '#131F35';
    ctx.strokeStyle = '#39D9FF';
    ctx.fillRect(560, 56, 190, 230);
    ctx.strokeRect(560, 56, 190, 230);

    ctx.fillStyle = '#96A4BA';
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.fillText('TEST INSTRUMENT', 580, 84);

    ctx.fillStyle = '#39D9FF';
    ctx.font = '700 28px "JetBrains Mono", monospace';
    const reading = pct < 0.25 ? '238.2 V' : pct < 0.6 ? '0.00 V' : '0.42 Ω';
    ctx.fillText(reading, 580, 130);

    ctx.fillStyle = '#10B981';
    ctx.font = '600 11px "JetBrains Mono", monospace';
    const statusText = pct < 0.25 ? 'PROVING UNIT OK' : pct < 0.6 ? 'ZERO ENERGY VERIFIED' : 'CONTINUITY PASS';
    ctx.fillText(statusText, 580, 160);

    ctx.fillStyle = '#96A4BA';
    ctx.font = '400 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`Lesson: ${lesson.title.slice(0, 32)}...`, 70, 314);
    ctx.fillText(`Timecode: ${formatClock(currentTime)} / ${formatClock(lesson.durationSeconds)}`, 560, 314);
  }, [currentTime, lesson]);

  const handleForwardSkip = async () => {
    try {
      const res = await apiFetch<{
        policyAction: string;
        enforcedTime: number;
        message: string;
        progress: LessonProgress;
      }>('/api/playback/event', {
        method: 'POST',
        body: JSON.stringify({
          lessonId: lesson.id,
          eventType: 'forward_skip',
          currentTime,
          requestedTime: Math.min(lesson.durationSeconds, currentTime + settings.forwardSkipSeconds),
        }),
      });

      setForwardSkips(res.progress.forwardSkipCount);
      setCurrentTime(res.enforcedTime);
      setPolicyWarning(res.message);

      if (res.policyAction === 'policy_reset') {
        setIsPlaying(false);
        addToast({
          title: 'Playback Reset to 00:00',
          message: res.message,
          variant: 'warning',
        });
      } else {
        addToast({
          title: 'Forward Skip Logged',
          message: res.message,
          variant: 'info',
        });
      }
      onRefresh();
    } catch (err) {
      addToast({
        title: 'Playback event error',
        message: err instanceof Error ? err.message : 'Failed',
        variant: 'error',
      });
    }
  };

  const handleBackwardSeek = async () => {
    const target = Math.max(0, currentTime - 10);
    setCurrentTime(target);
    await apiFetch('/api/playback/event', {
      method: 'POST',
      body: JSON.stringify({
        lessonId: lesson.id,
        eventType: 'backward_seek',
        currentTime,
        requestedTime: target,
      }),
    }).catch(() => undefined);
  };

  const handleCompleteLesson = async () => {
    try {
      const res = await apiFetch<{
        policyAction: string;
        message: string;
      }>('/api/playback/event', {
        method: 'POST',
        body: JSON.stringify({
          lessonId: lesson.id,
          eventType: 'complete',
          currentTime,
        }),
      });
      if (res.policyAction === 'checkpoints_pending') {
        addToast({ title: 'Completion Blocked', message: res.message, variant: 'warning' });
      } else {
        addToast({ title: 'Lesson Completed', message: 'Competency progress recorded.', variant: 'success' });
        onRefresh();
      }
    } catch (err) {
      addToast({ title: 'Error', message: err instanceof Error ? err.message : 'Failed', variant: 'error' });
    }
  };

  const toggleVoiceCapture = () => {
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;

    if (!SpeechRec) {
      addToast({
        title: 'Voice Transcription Unavailable',
        message: 'Browser speech recognition not supported here—please type your answer.',
        variant: 'info',
      });
      return;
    }

    if (isRecordingVoice && recognitionRef.current) {
      (recognitionRef.current as { stop: () => void }).stop();
      setIsRecordingVoice(false);
      return;
    }

    const rec = new SpeechRec() as {
      lang: string;
      interimResults: boolean;
      onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
      onerror: () => void;
      onend: () => void;
      start: () => void;
    };
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || '';
      setAnswerText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    rec.onerror = () => setIsRecordingVoice(false);
    rec.onend = () => setIsRecordingVoice(false);
    recognitionRef.current = rec;
    setIsRecordingVoice(true);
    rec.start();
  };

  const submitCheckpointAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCheckpoint || !answerText.trim()) return;
    setSubmittingAnswer(true);
    try {
      const res = await apiFetch<{
        evaluation: {
          score: number;
          passed: boolean;
          feedback: string;
          strengths: string[];
          gaps: string[];
          model: string;
        };
      }>(`/api/lessons/${lesson.id}/checkpoint`, {
        method: 'POST',
        body: JSON.stringify({
          questionId: activeCheckpoint.id,
          answer: answerText,
        }),
      });
      setLastEvaluation(res.evaluation);
      addToast({
        title: res.evaluation.passed ? `Checkpoint Passed (${res.evaluation.score}%)` : `Review Needed (${res.evaluation.score}%)`,
        variant: res.evaluation.passed ? 'success' : 'warning',
      });
      onRefresh();
    } catch (err) {
      addToast({
        title: 'AI Evaluation Failed',
        message: err instanceof Error ? err.message : 'Unable to evaluate answer',
        variant: 'error',
      });
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const remainingSkips = Math.max(0, settings.maxForwardSkips - forwardSkips);
  const progressPct = Math.min(100, (currentTime / lesson.durationSeconds) * 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate('/apprentice/learning')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-[#96A4BA] hover:text-slate-950 dark:hover:text-white cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Pathway</span>
        </button>

        <div className="flex items-center gap-3 text-xs">
          <span className="font-mono-tech text-slate-500 dark:text-[#96A4BA]">
            Forward Skips Used: {forwardSkips}/{settings.maxForwardSkips} ({remainingSkips} left before 00:00 reset)
          </span>
        </div>
      </div>

      {policyWarning && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{policyWarning}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Custom Video Player Stage */}
        <div
          ref={stageRef}
          className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#080D19] overflow-hidden"
        >
          <div className="relative aspect-[16/9] bg-[#080D19]">
            <canvas ref={canvasRef} width={800} height={360} className="w-full h-full object-contain" />
            <div className="absolute top-3 left-3 rounded-lg bg-[#080D19]/80 border border-white/10 px-3 py-1.5 text-[11px] font-mono-tech text-[#39D9FF]">
              {lesson.title}
            </div>
          </div>

          {/* Progress Bar with Checkpoint Markers */}
          <div className="p-4 bg-[#0E1628] border-t border-slate-800 space-y-3">
            <div className="relative h-2.5 w-full rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#39D9FF] to-[#537CFF]"
                style={{ width: `${progressPct}%` }}
              />
              {lesson.checkpoints.map((cp) => {
                const pos = (cp.timestampSeconds / lesson.durationSeconds) * 100;
                const passed = (progress?.passedCheckpoints?.[cp.id]?.score ?? 0) >= 70;
                return (
                  <button
                    key={cp.id}
                    type="button"
                    title={`Checkpoint at ${formatClock(cp.timestampSeconds)}`}
                    onClick={() => {
                      setIsPlaying(false);
                      setActiveCheckpoint(cp);
                    }}
                    style={{ left: `${pos}%` }}
                    className={`absolute -top-1 -translate-x-1/2 h-4 w-4 rounded-full border-2 border-[#080D19] cursor-pointer ${
                      passed ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#F4F7FC]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!isPlaying && cameraGuardEnabled && !cameraReady) {
                      addToast({
                        title: 'Enable Camera First',
                        message: 'Start your Learner Camera below to maintain live presence during playback, or toggle Camera Guard.',
                        variant: 'warning',
                      });
                      return;
                    }
                    if (!isPlaying && cameraGuardEnabled && !cameraEnrolled) {
                      addToast({
                        title: 'Complete Enrollment Photo First',
                        message: 'Position your face in the camera frame so your reference photo & tracker are trained before playback starts.',
                        variant: 'warning',
                      });
                      return;
                    }
                    setIsPlaying((p) => !p);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#39D9FF] text-[#080D19] font-semibold cursor-pointer"
                >
                  {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  <span>{isPlaying ? 'Pause' : 'Play'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleBackwardSeek}
                  title="Backward seek (-10s allowed)"
                  className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>-10s</span>
                </button>
                <button
                  type="button"
                  onClick={handleForwardSkip}
                  title={`Forward skip (+${settings.forwardSkipSeconds}s, policy monitored)`}
                  className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 cursor-pointer"
                >
                  <FastForward className="h-3.5 w-3.5" />
                  <span>+{settings.forwardSkipSeconds}s</span>
                </button>
                <span className="font-mono-tech text-[#96A4BA] ml-1">
                  {formatClock(currentTime)} / {formatClock(lesson.durationSeconds)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  aria-label="Playback speed"
                  className="rounded-md bg-[#080D19] border border-slate-700 px-2 py-1 text-xs font-mono-tech"
                >
                  <option value={1}>1.0x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                </select>
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  aria-label="Toggle mute"
                  className="p-2 rounded-lg border border-slate-700 hover:bg-slate-800 cursor-pointer"
                >
                  {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => stageRef.current?.requestFullscreen?.().catch(() => undefined)}
                  aria-label="Fullscreen"
                  className="p-2 rounded-lg border border-slate-700 hover:bg-slate-800 cursor-pointer"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 bg-[#080D19] border-t border-slate-800/80 flex items-center justify-between gap-3 text-[11px] text-[#96A4BA]">
            <span className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-[#39D9FF] shrink-0" />
              Skip policy & camera presence enforced server-side.
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <label className="inline-flex items-center gap-1.5 text-[11px] text-[#F4F7FC] cursor-pointer">
                <input
                  type="checkbox"
                  checked={cameraGuardEnabled}
                  onChange={(e) => setCameraGuardEnabled(e.target.checked)}
                />
                <span>Camera Presence Guard</span>
              </label>
              <button
                type="button"
                onClick={handleCompleteLesson}
                className="px-3 py-1.5 rounded-md bg-emerald-500/20 text-emerald-300 font-semibold hover:bg-emerald-500/30 cursor-pointer"
              >
                Verify Completion
              </button>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-[#0E1628] border-t border-slate-200 dark:border-slate-800">
            <CameraPresenceMonitor
              activeMonitoring={isPlaying && cameraGuardEnabled}
              inactivityLimitSeconds={10}
              autoStart={true}
              title="Live Learner Camera Phase"
              onCameraStateChange={setCameraReady}
              onEnrollmentChange={(enrolled) => setCameraEnrolled(enrolled)}
              onInactivityTrigger={handleCameraInactivity}
            />
          </div>
        </div>

        {/* Embedded AI Video Assessment Workspace */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 space-y-5">
          <div>
            <p className="text-xs font-medium text-[#0284C7] dark:text-[#39D9FF]">Embedded Video Assessment</p>
            <h3 className="mt-1 font-display text-lg font-bold">
              {activeCheckpoint ? `Checkpoint at ${formatClock(activeCheckpoint.timestampSeconds)}` : 'Select or Reach a Checkpoint'}
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {lesson.checkpoints.map((cp, idx) => {
              const saved = progress?.passedCheckpoints?.[cp.id];
              return (
                <button
                  key={cp.id}
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setActiveCheckpoint(cp);
                    setAnswerText(saved?.answer || '');
                    setLastEvaluation(
                      saved
                        ? {
                            score: saved.score,
                            passed: saved.score >= 70,
                            feedback: saved.feedback,
                            strengths: saved.strengths,
                            gaps: saved.gaps,
                            model: saved.mode,
                          }
                        : null,
                    );
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                    activeCheckpoint?.id === cp.id
                      ? 'border-[#0284C7] dark:border-[#39D9FF] bg-[#0284C7]/10 text-[#0284C7] dark:text-[#39D9FF]'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-[#96A4BA]'
                  }`}
                >
                  Checkpoint {idx + 1} ({formatClock(cp.timestampSeconds)}) {saved ? `· ${saved.score}%` : ''}
                </button>
              );
            })}
          </div>

          {activeCheckpoint ? (
            <form onSubmit={submitCheckpointAnswer} className="space-y-4">
              <div className="rounded-xl bg-slate-50 dark:bg-[#131F35] p-4">
                <p className="font-mono-tech text-[11px] text-[#0284C7] dark:text-[#39D9FF]">
                  {activeCheckpoint.competencyCode}
                </p>
                <p className="mt-1 text-sm font-semibold">{activeCheckpoint.prompt}</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-600 dark:text-[#96A4BA]">
                    Your Explanation (Voice or Text)
                  </label>
                  <button
                    type="button"
                    onClick={toggleVoiceCapture}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                      isRecordingVoice
                        ? 'bg-rose-500 text-white'
                        : 'bg-slate-100 dark:bg-[#131F35] text-slate-700 dark:text-[#96A4BA]'
                    }`}
                  >
                    {isRecordingVoice ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                    <span>{isRecordingVoice ? 'Stop Mic' : 'Voice Answer'}</span>
                  </button>
                </div>
                <textarea
                  rows={4}
                  required
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Explain the technical reasoning and safety principles..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#080D19] p-3 text-sm focus:outline-none focus:border-[#39D9FF]"
                />
              </div>

              <button
                type="submit"
                disabled={submittingAnswer}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#0284C7] dark:bg-[#39D9FF] text-white dark:text-[#080D19] py-2.5 px-4 text-xs font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{submittingAnswer ? 'Evaluating with Gemini AI...' : 'Submit for AI Evaluation'}</span>
              </button>

              {lastEvaluation && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D19] p-4 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5">
                      <CheckCircle2
                        className={`h-4 w-4 ${lastEvaluation.passed ? 'text-emerald-500' : 'text-amber-500'}`}
                      />
                      Score: {lastEvaluation.score}% ({lastEvaluation.passed ? 'Passed' : 'Review Recommended'})
                    </span>
                    <span className="font-mono-tech text-[11px] text-slate-500">{lastEvaluation.model}</span>
                  </div>
                  <p className="text-slate-700 dark:text-[#F4F7FC]">{lastEvaluation.feedback}</p>
                  {lastEvaluation.strengths.length > 0 && (
                    <p className="text-emerald-600 dark:text-emerald-400">
                      Strengths: {lastEvaluation.strengths.join(' · ')}
                    </p>
                  )}
                  {lastEvaluation.gaps.length > 0 && (
                    <p className="text-amber-600 dark:text-amber-400">
                      Gaps: {lastEvaluation.gaps.join(' · ')}
                    </p>
                  )}
                </div>
              )}
            </form>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-5 text-xs text-slate-600 dark:text-[#96A4BA]">
              Press Play on the video player. Playback pauses automatically at each assessment marker, or click any Checkpoint tab above to inspect and submit your explanation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
