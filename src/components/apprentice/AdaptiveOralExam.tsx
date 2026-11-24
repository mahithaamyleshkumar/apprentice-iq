import React, { useRef, useState } from 'react';
import { CheckCircle2, Mic, MicOff, Send, Volume2 } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import type { ApprenticeBundle } from './ApprenticeDashboard.tsx';
import type { PracticalSubmission } from '../../types.ts';

export const AdaptiveOralExam: React.FC<{
  data: ApprenticeBundle;
  initialSubmissionId?: string;
  onRefresh: () => void;
}> = ({ data, initialSubmissionId, onRefresh }) => {
  const { apiFetch, addToast } = useApp();
  const [selectedId, setSelectedId] = useState(
    initialSubmissionId || data.submissions[0]?.id || '',
  );
  const [answerText, setAnswerText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptSource, setTranscriptSource] = useState<'voice' | 'text'>('text');
  const [loading, setLoading] = useState(false);
  const recRef = useRef<unknown>(null);

  const submission: PracticalSubmission | undefined =
    data.submissions.find((s) => s.id === selectedId) || data.submissions[0];

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.02;
      window.speechSynthesis.speak(utter);
    }
  };

  const toggleMic = () => {
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;

    if (!SpeechRec) {
      addToast({ title: 'Speech Recognition Unavailable', message: 'Please type your oral defense response.', variant: 'info' });
      return;
    }

    if (isRecording && recRef.current) {
      (recRef.current as { stop: () => void }).stop();
      setIsRecording(false);
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
    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript || '';
      setAnswerText((prev) => (prev ? `${prev} ${text}` : text));
      setTranscriptSource('voice');
    };
    rec.onerror = () => setIsRecording(false);
    rec.onend = () => setIsRecording(false);
    recRef.current = rec;
    setIsRecording(true);
    rec.start();
  };

  const handleTurn = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!submission) return;
    setLoading(true);
    try {
      const res = await apiFetch<{
        submission: PracticalSubmission;
        turnResult: { nextQuestion: string | null; examComplete: boolean };
      }>(`/api/oral/${submission.id}/turn`, {
        method: 'POST',
        body: JSON.stringify({
          studentAnswer: answerText.trim() || undefined,
          transcriptSource,
        }),
      });
      setAnswerText('');
      setTranscriptSource('text');
      if (res.turnResult.nextQuestion) {
        speakText(res.turnResult.nextQuestion);
      }
      if (res.turnResult.examComplete) {
        addToast({
          title: 'Oral Examination Completed',
          message: 'Queued for authorised Mentor/Assessor final verification.',
          variant: 'success',
        });
      }
      onRefresh();
    } catch (err) {
      addToast({
        title: 'Oral Examiner Error',
        message: err instanceof Error ? err.message : 'Unable to process turn',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!submission) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-8 text-center">
        <p className="font-display text-lg font-bold">No Practical Submission Selected</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-[#96A4BA]">
          Submit a practical demonstration in Skill Vision first so the Adaptive Examiner can ask task-specific questions.
        </p>
      </div>
    );
  }

  const pendingTurn = submission.oralExam.turns.find((t) => !t.studentAnswer);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#537CFF]">Adaptive AI Oral Examiner</p>
          <h2 className="mt-1 font-display text-xl font-bold">{submission.taskTitle}</h2>
          <p className="text-xs text-slate-500 dark:text-[#96A4BA] mt-0.5">
            {submission.competencyCode} · Questions adapt dynamically to your practical evidence and answers.
          </p>
        </div>
        <select
          value={submission.id}
          onChange={(e) => setSelectedId(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#080D19] px-3 py-2 text-xs font-semibold"
        >
          {data.submissions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.competencyCode} · {s.taskTitle.slice(0, 34)} ({s.oralExam.status})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Transcript & Question Feed */}
        <div className="lg:col-span-7 space-y-4">
          {submission.oralExam.turns.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-8 text-center space-y-4">
              <p className="font-display text-lg font-bold">Ready to Begin Adaptive Oral Defense</p>
              <p className="text-sm text-slate-600 dark:text-[#96A4BA] max-w-md mx-auto">
                The examiner will generate 3 adaptive questions grounded in your {submission.competencyCode} practical submission.
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleTurn()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0284C7] dark:bg-[#39D9FF] text-white dark:text-[#080D19] text-xs font-semibold cursor-pointer"
              >
                <Mic className="h-4 w-4" />
                <span>{loading ? 'Generating Question 1...' : 'Start Oral Examination'}</span>
              </button>
            </div>
          ) : (
            submission.oralExam.turns.map((turn) => (
              <div
                key={turn.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-5 space-y-3"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono-tech text-[#0284C7] dark:text-[#39D9FF]">
                    Question {turn.turnNumber} · {turn.difficulty.toUpperCase()} · {turn.competencyCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => speakText(turn.question)}
                    className="inline-flex items-center gap-1 text-slate-500 hover:text-white cursor-pointer"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>Read Aloud</span>
                  </button>
                </div>
                <p className="font-semibold text-sm">{turn.question}</p>

                {turn.studentAnswer && (
                  <div className="rounded-xl bg-slate-50 dark:bg-[#131F35] p-3.5 text-xs space-y-2">
                    <div className="flex items-center justify-between text-slate-500 dark:text-[#96A4BA]">
                      <span>Your Transcript ({turn.transcriptSource || 'text'})</span>
                      <span className="font-mono-tech font-bold text-emerald-500">{turn.score}%</span>
                    </div>
                    <p className="text-slate-900 dark:text-[#F4F7FC]">{turn.studentAnswer}</p>
                    {turn.feedback && <p className="text-[#0284C7] dark:text-[#39D9FF]">{turn.feedback}</p>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Active Response & Final Oral Summary */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 space-y-4">
          {submission.oralExam.status === 'completed' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                <CheckCircle2 className="h-5 w-5" />
                <span>Oral Examination Complete · {submission.oralExam.overallScore}%</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-[#96A4BA] leading-relaxed">
                {submission.oralExam.summary}
              </p>
              <div className="rounded-xl bg-slate-50 dark:bg-[#131F35] p-3.5 text-xs text-slate-500 dark:text-[#96A4BA]">
                Oral reasoning scores never independently certify competence. Final sign-off awaits Mentor or Assessor review.
              </div>
            </div>
          ) : pendingTurn ? (
            <form onSubmit={handleTurn} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold">Answer Question {pendingTurn.turnNumber}</h3>
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                    isRecording
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-100 dark:bg-[#131F35] text-slate-700 dark:text-[#96A4BA]'
                  }`}
                >
                  {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                  <span>{isRecording ? 'Recording Voice...' : 'Speak Answer'}</span>
                </button>
              </div>
              <textarea
                rows={5}
                required
                value={answerText}
                onChange={(e) => {
                  setAnswerText(e.target.value);
                  setTranscriptSource('text');
                }}
                placeholder="Explain your technical reasoning..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#080D19] p-3 text-sm focus:outline-none focus:border-[#39D9FF]"
              />
              <button
                type="submit"
                disabled={loading || !answerText.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#0284C7] dark:bg-[#39D9FF] text-white dark:text-[#080D19] py-2.5 px-4 text-xs font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{loading ? 'Evaluating & Adapting Next Question...' : 'Submit Oral Response'}</span>
              </button>
            </form>
          ) : (
            <p className="text-xs text-slate-500 dark:text-[#96A4BA]">
              Click “Start Oral Examination” on the left to begin Question 1.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
