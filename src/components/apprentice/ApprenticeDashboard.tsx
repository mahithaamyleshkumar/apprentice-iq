import React, { useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Eye,
  FileText,
  Lock,
  Play,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import {
  AppImage,
  CompetencyStateIndicator,
  MetricCard,
  RiskLabel,
} from '../ui/DesignPrimitives.tsx';
import type {
  Competency,
  LearningRiskRecord,
  Lesson,
  LessonProgress,
  Module,
  PlatformSettings,
  PracticalSubmission,
  PracticalTask,
  SkillPassport,
  StudentCompetency,
  Trade,
} from '../../types.ts';

export interface ApprenticeBundle {
  trades: Trade[];
  modules: Module[];
  lessons: Lesson[];
  competencies: Competency[];
  practicalTasks: PracticalTask[];
  settings: PlatformSettings;
  progress: LessonProgress[];
  studentCompetencies: StudentCompetency[];
  submissions: PracticalSubmission[];
  passport: SkillPassport | null;
  riskRecord: LearningRiskRecord | null;
}

export const ApprenticeDashboard: React.FC<{
  data: ApprenticeBundle;
  onRefresh: () => void;
}> = ({ data, onRefresh }) => {
  const { user, navigate, apiFetch, addToast } = useApp();
  const [updatingTrade, setUpdatingTrade] = useState(false);

  if (!user) return null;

  const activeTrade = data.trades.find((t) => t.id === user.tradeId) || data.trades[0];
  const tradeLessons = data.lessons.filter((l) => l.tradeId === activeTrade.id);
  const completedLessons = data.progress.filter((p) => p.completed).length;
  const tradeComps = data.competencies.filter((c) => c.tradeId === activeTrade.id);
  const verifiedCount = data.studentCompetencies.filter((sc) => sc.state === 'verified').length;
  const demonstratedCount = data.studentCompetencies.filter((sc) => sc.state === 'demonstrated').length;
  const overallProgressPct =
    tradeLessons.length > 0 ? Math.round((completedLessons / tradeLessons.length) * 100) : 0;

  const nextLesson =
    tradeLessons.find((l) => !data.progress.some((p) => p.lessonId === l.id && p.completed)) ||
    tradeLessons[0];

  const handleTradeChange = async (tradeId: string) => {
    setUpdatingTrade(true);
    try {
      await apiFetch('/api/apprentice/select-trade', {
        method: 'POST',
        body: JSON.stringify({ tradeId }),
      });
      addToast({ title: 'Trade pathway updated', variant: 'success' });
      onRefresh();
    } catch (err) {
      addToast({
        title: 'Unable to update trade',
        message: err instanceof Error ? err.message : 'Error',
        variant: 'error',
      });
    } finally {
      setUpdatingTrade(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome & Trade Selector */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <p className="text-xs font-medium text-[#0284C7] dark:text-[#39D9FF]">
            {activeTrade.code} · {user.institution} · Cohort {user.cohort}
          </p>
          <h2 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user.name}
          </h2>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-[#96A4BA] max-w-2xl">
            Every skill moves through four distinct stages: Learned, Practised, Demonstrated, and Mentor-Verified.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-[#96A4BA] mb-1">
              Active Trade Pathway
            </label>
            <select
              disabled={updatingTrade}
              value={activeTrade.id}
              onChange={(e) => handleTradeChange(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#080D19] px-3 py-2 text-xs font-semibold"
            >
              {data.trades.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
          </div>
          {nextLesson && (
            <button
              type="button"
              onClick={() => navigate(`/apprentice/lesson/${nextLesson.id}`)}
              className="sm:mt-5 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#0284C7] dark:bg-[#39D9FF] text-white dark:text-[#080D19] text-xs font-semibold hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Continue Learning</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Pathway Progress"
          value={`${overallProgressPct}%`}
          detail={`${completedLessons} of ${tradeLessons.length} lessons completed`}
          tone="cyan"
        />
        <MetricCard
          label="Verified Competencies"
          value={`${verifiedCount} / ${tradeComps.length}`}
          detail="Approved by Mentor or Assessor"
          tone="emerald"
        />
        <MetricCard
          label="Awaiting Verification"
          value={demonstratedCount}
          detail="Practical & oral evidence submitted"
          tone="amber"
        />
        <MetricCard
          label="Skill Passport"
          value={data.passport?.status === 'active' ? 'Active' : 'Pending'}
          detail={data.passport?.passportId || 'Not issued'}
        />
      </div>

      {/* Continue Learning & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-12 items-stretch">
            <div className="sm:col-span-5 min-h-[180px]">
              <AppImage
                src={activeTrade.imageUrl}
                alt={activeTrade.name}
                className="w-full h-full object-cover min-h-[180px]"
              />
            </div>
            <div className="sm:col-span-7 p-6 flex flex-col justify-between">
              <div>
                <p className="text-xs font-medium text-[#0284C7] dark:text-[#39D9FF]">Next Recommended Lesson</p>
                <h3 className="mt-1 font-display text-lg font-bold">
                  {nextLesson ? nextLesson.title : 'All lessons completed'}
                </h3>
                <p className="mt-2 text-xs text-slate-600 dark:text-[#96A4BA] leading-relaxed">
                  {nextLesson?.summary || 'Proceed to Practical Skill Vision to demonstrate your competencies.'}
                </p>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {nextLesson && (
                  <button
                    type="button"
                    onClick={() => navigate(`/apprentice/lesson/${nextLesson.id}`)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0284C7] dark:bg-[#39D9FF] text-white dark:text-[#080D19] text-xs font-semibold cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Open Video Lesson</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate('/apprentice/practical')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-[#131F35] cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Submit Practical Task</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold">Predictive Learning Insights</h3>
              {data.riskRecord && <RiskLabel level={data.riskRecord.riskLevel} />}
            </div>
            <div className="mt-4 space-y-2">
              {(data.riskRecord?.recommendations || ['Continue module progression and attempt practical tasks.']).map(
                (rec, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-[#96A4BA]">
                    <Sparkles className="h-3.5 w-3.5 text-[#0284C7] dark:text-[#39D9FF] shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/apprentice/copilot')}
              className="text-xs font-semibold text-[#0284C7] dark:text-[#39D9FF] hover:underline cursor-pointer"
            >
              Ask AI Learning Copilot →
            </button>
            <button
              type="button"
              onClick={() => navigate('/apprentice/passport')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-[#96A4BA] hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <Award className="h-3.5 w-3.5" />
              <span>View Passport</span>
            </button>
          </div>
        </div>
      </div>

      {/* Competency Status Snapshot */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-lg font-bold">Recent Competency Trajectory</h3>
            <p className="text-xs text-slate-500 dark:text-[#96A4BA]">
              Live snapshot of your {activeTrade.name} competencies
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/apprentice/skill-map')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0284C7] dark:text-[#39D9FF] hover:underline cursor-pointer"
          >
            <span>Open Full Skill Gap Map</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tradeComps.slice(0, 6).map((comp) => {
            const sc = data.studentCompetencies.find((s) => s.competencyId === comp.id);
            return (
              <div
                key={comp.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800/80 p-4 flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono-tech text-xs text-slate-500 dark:text-[#96A4BA]">{comp.code}</span>
                  <CompetencyStateIndicator state={sc?.state || 'not_started'} />
                </div>
                <p className="text-sm font-semibold">{comp.title}</p>
                <p className="text-xs text-slate-500 dark:text-[#96A4BA] line-clamp-2">{comp.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const LearningHub: React.FC<{ data: ApprenticeBundle }> = ({ data }) => {
  const { user, navigate } = useApp();
  const [selectedPdf, setSelectedPdf] = useState<Lesson | null>(null);

  if (!user) return null;

  const activeTrade = data.trades.find((t) => t.id === user.tradeId) || data.trades[0];
  const tradeModules = data.modules
    .filter((m) => m.tradeId === activeTrade.id)
    .sort((a, b) => a.order - b.order);

  const isLessonCompleted = (lessonId: string) =>
    data.progress.some((p) => p.lessonId === lessonId && p.completed);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#0284C7] dark:text-[#39D9FF]">{activeTrade.code} Learning Pathway</p>
          <h2 className="font-display text-2xl font-bold">{activeTrade.name}</h2>
          <p className="text-sm text-slate-600 dark:text-[#96A4BA] mt-1">{activeTrade.description}</p>
        </div>
      </div>

      {tradeModules.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-8 text-center">
          <BookOpen className="h-8 w-8 text-[#0284C7] dark:text-[#39D9FF] mx-auto mb-3" />
          <p className="font-display text-base font-bold">Module Curriculum Ready for Electrician Pathway</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-[#96A4BA]">
            Switch to the Electrician (EL-L3) trade on your dashboard to access the complete interactive demonstration modules.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {tradeModules.map((mod) => {
            const modLessons = data.lessons
              .filter((l) => l.moduleId === mod.id)
              .sort((a, b) => a.order - b.order);
            return (
              <div
                key={mod.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] overflow-hidden"
              >
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-mono-tech text-xs text-[#0284C7] dark:text-[#39D9FF]">
                      Module 0{mod.order} · {mod.estimatedHours} Hours
                    </p>
                    <h3 className="mt-1 font-display text-lg font-bold">{mod.title}</h3>
                    <p className="mt-1 text-xs text-slate-600 dark:text-[#96A4BA]">{mod.description}</p>
                  </div>
                </div>

                {modLessons.length === 0 ? (
                  <div className="p-6 text-xs text-slate-500 dark:text-[#96A4BA]">
                    Practical tasks for this module are available in Skill Vision.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {modLessons.map((lesson) => {
                      const prog = data.progress.find((p) => p.lessonId === lesson.id);
                      const completed = Boolean(prog?.completed);
                      const prereqMet =
                        !lesson.prerequisiteLessonId || isLessonCompleted(lesson.prerequisiteLessonId);

                      return (
                        <div
                          key={lesson.id}
                          className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              {completed ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Completed
                                </span>
                              ) : prereqMet ? (
                                <span className="font-mono-tech text-[#0284C7] dark:text-[#39D9FF]">
                                  Ready · {Math.round(lesson.durationSeconds / 60)}m video · {lesson.checkpoints.length} checkpoints
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                                  <Lock className="h-3.5 w-3.5" />
                                  Prerequisite Required
                                </span>
                              )}
                            </div>
                            <h4 className="font-semibold text-sm">{lesson.title}</h4>
                            <p className="text-xs text-slate-600 dark:text-[#96A4BA] max-w-2xl">{lesson.summary}</p>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => setSelectedPdf(lesson)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-[#131F35] cursor-pointer"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span>Field Guide</span>
                            </button>
                            <button
                              type="button"
                              disabled={!prereqMet}
                              onClick={() => navigate(`/apprentice/lesson/${lesson.id}`)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0284C7] dark:bg-[#39D9FF] text-white dark:text-[#080D19] text-xs font-semibold hover:opacity-90 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                            >
                              <Play className="h-3.5 w-3.5" />
                              <span>{completed ? 'Review' : 'Start Lesson'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Field Guide Modal */}
      {selectedPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-w-lg w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-mono-tech text-xs text-[#0284C7] dark:text-[#39D9FF]">Technical Reference Sheet</p>
              <button
                type="button"
                onClick={() => setSelectedPdf(null)}
                className="text-xs text-slate-500 hover:text-white cursor-pointer"
              >
                Close
              </button>
            </div>
            <h3 className="font-display text-lg font-bold">{selectedPdf.pdfTitle}</h3>
            <p className="text-sm text-slate-600 dark:text-[#96A4BA]">{selectedPdf.pdfSummary}</p>
            <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
              <p className="text-xs font-bold">Key Takeaways</p>
              {selectedPdf.keyTakeaways.map((kt, i) => (
                <p key={i} className="text-xs text-slate-600 dark:text-[#96A4BA]">
                  • {kt}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
