import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  MessageSquare,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../../context/AppContext.tsx';
import { AppImage, MetricCard, RiskLabel, SkeletonBlock } from '../ui/DesignPrimitives.tsx';
import type { Competency, LearningRiskRecord, PracticalSubmission, PublicUser } from '../../types.ts';

interface MentorOverviewPayload {
  apprentices: (PublicUser & {
    verifiedCount: number;
    demonstratedCount: number;
    completedLessons: number;
    risk?: LearningRiskRecord;
    passportId?: string;
    passportStatus?: string;
  })[];
  submissions: PracticalSubmission[];
  riskRecords: LearningRiskRecord[];
  competencies: Competency[];
}

export const MentorCommandCentre: React.FC<{
  activeTab?: 'overview' | 'apprentices' | 'reviews' | 'integrity' | 'analytics';
  portalRole?: 'mentor' | 'assessor';
  searchQuery?: string;
}> = ({ activeTab = 'overview', portalRole = 'mentor', searchQuery = '' }) => {
  const { apiFetch, addToast } = useApp();
  const [data, setData] = useState<MentorOverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSubId, setSelectedSubId] = useState<string>('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [deciding, setDeciding] = useState(false);

  // AI Mentor Assistant
  const [assistantQuery, setAssistantQuery] = useState('Which apprentices are struggling with electrical safety or need intervention?');
  const [assistantAnswer, setAssistantAnswer] = useState<{
    answer: string;
    citedApprentices: string[];
    recommendedActions: string[];
    model: string;
  } | null>(null);
  const [queryingAi, setQueryingAi] = useState(false);

  const loadOverview = () => {
    setLoading(true);
    apiFetch<MentorOverviewPayload>('/api/mentor/overview')
      .then((res) => {
        setData(res);
        if (!selectedSubId && res.submissions.length > 0) {
          const firstPending = res.submissions.find((s) => s.status === 'pending_review' || s.status === 'ai_analyzed');
          setSelectedSubId(firstPending?.id || res.submissions[0].id);
        }
      })
      .catch((err) =>
        addToast({
          title: 'Failed to load Mentor Centre',
          message: err instanceof Error ? err.message : 'Error',
          variant: 'error',
        }),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const handleDecision = async (decision: 'approved' | 'rejected' | 'reassessment_requested') => {
    if (!selectedSubId || !reviewNotes.trim()) {
      addToast({ title: 'Reviewer Notes Required', message: 'Please enter notes explaining your verification decision.', variant: 'warning' });
      return;
    }
    setDeciding(true);
    try {
      await apiFetch(`/api/reviews/${selectedSubId}/decide`, {
        method: 'POST',
        body: JSON.stringify({ decision, notes: reviewNotes }),
      });
      addToast({
        title: decision === 'approved' ? 'Competency Verified & Passport Updated' : 'Decision Recorded',
        variant: decision === 'approved' ? 'success' : 'info',
      });
      setReviewNotes('');
      loadOverview();
    } catch (err) {
      addToast({
        title: 'Verification Failed',
        message: err instanceof Error ? err.message : 'Error',
        variant: 'error',
      });
    } finally {
      setDeciding(false);
    }
  };

  const askAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantQuery.trim()) return;
    setQueryingAi(true);
    try {
      const res = await apiFetch<{
        answer: string;
        citedApprentices: string[];
        recommendedActions: string[];
        model: string;
      }>('/api/mentor/assistant', {
        method: 'POST',
        body: JSON.stringify({ question: assistantQuery }),
      });
      setAssistantAnswer(res);
    } catch (err) {
      addToast({
        title: 'Mentor Assistant Unavailable',
        message: err instanceof Error ? err.message : 'Error',
        variant: 'error',
      });
    } finally {
      setQueryingAi(false);
    }
  };

  if (loading || !data) return <SkeletonBlock rows={6} />;

  const pendingSubmissions = data.submissions.filter(
    (s) => s.status === 'pending_review' || s.status === 'ai_analyzed' || s.status === 'oral_completed',
  );
  const integrityAlerts = data.submissions.filter((s) => s.integrityCheck.riskLevel !== 'low');
  const highRiskLearners = data.riskRecords.filter((r) => r.riskLevel === 'high');

  const filteredApprentices = data.apprentices.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.cohort.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const selectedSubmission = data.submissions.find((s) => s.id === selectedSubId) || data.submissions[0];

  const chartData = data.apprentices.map((a) => ({
    name: a.name.split(' ')[0],
    Verified: a.verifiedCount,
    Demonstrated: a.demonstratedCount,
    Lessons: a.completedLessons,
  }));

  return (
    <div className="space-y-8">
      {/* Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Assigned Apprentices"
          value={data.apprentices.length}
          detail="Active across Apex cohorts"
          tone="cyan"
        />
        <MetricCard
          label="Awaiting Verification"
          value={pendingSubmissions.length}
          detail={portalRole === 'assessor' ? 'In Assessor Queue' : 'Practical & oral submissions'}
          tone="amber"
        />
        <MetricCard
          label="Integrity Radar Alerts"
          value={integrityAlerts.length}
          detail="Requires human inspection"
          tone={integrityAlerts.length > 0 ? 'rose' : 'emerald'}
        />
        <MetricCard
          label="High-Risk Learners"
          value={highRiskLearners.length}
          detail="Recommended for mentor check-in"
          tone={highRiskLearners.length > 0 ? 'amber' : 'emerald'}
        />
      </div>

      {/* AI Mentor Assistant */}
      {(activeTab === 'overview' || activeTab === 'apprentices') && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#0284C7] dark:text-[#39D9FF]" />
              <h2 className="font-display text-base font-bold">AI Mentor Command Assistant</h2>
            </div>
            <span className="text-xs text-slate-500 dark:text-[#96A4BA]">Grounded in Authorised Cohort Records</span>
          </div>

          <form onSubmit={askAssistant} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={assistantQuery}
              onChange={(e) => setAssistantQuery(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#080D19] px-4 py-2 text-xs"
            />
            <button
              type="submit"
              disabled={queryingAi}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-[#0284C7] dark:bg-[#39D9FF] text-white dark:text-[#080D19] text-xs font-semibold shrink-0 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{queryingAi ? 'Analyzing Cohort...' : 'Query Records'}</span>
            </button>
          </form>

          {assistantAnswer && (
            <div className="rounded-xl bg-slate-50 dark:bg-[#131F35] p-4 space-y-2 text-xs">
              <p className="text-slate-900 dark:text-[#F4F7FC] leading-relaxed">{assistantAnswer.answer}</p>
              <p className="text-[#0284C7] dark:text-[#39D9FF]">
                Cited Records: {assistantAnswer.citedApprentices.join(' · ') || 'Cohort Summary'}
              </p>
              <div className="pt-1 space-y-1 text-slate-600 dark:text-[#96A4BA]">
                {assistantAnswer.recommendedActions.map((act, i) => (
                  <p key={i}>• {act}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Evidence Review & Competency Approval Split Workspace */}
      {(activeTab === 'overview' || activeTab === 'reviews') && selectedSubmission && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold">
              {portalRole === 'assessor' ? 'Assessor Practical & Oral Queue' : 'Practical Evidence Verification'}
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.submissions.map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setSelectedSubId(sub.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                    selectedSubmission.id === sub.id
                      ? 'border-[#0284C7] dark:border-[#39D9FF] bg-[#0284C7]/10 text-[#0284C7] dark:text-[#39D9FF]'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {sub.studentName} · {sub.competencyCode} ({sub.status.replace('_', ' ')})
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Evidence & Timeline */}
            <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-semibold">
                  {selectedSubmission.studentName} · {selectedSubmission.taskTitle}
                </span>
                <span className="font-mono-tech text-[#0284C7] dark:text-[#39D9FF]">
                  {selectedSubmission.competencyCode}
                </span>
              </div>
              <div className="aspect-[16/9] bg-[#080D19] relative">
                <AppImage
                  src="/src/assets/images/vision_switchgear_bench_1795499741948.jpg"
                  alt={selectedSubmission.mediaLabel}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#080D19]/80 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                  <span>{selectedSubmission.mediaLabel}</span>
                  <span className="font-mono-tech text-[#39D9FF]">
                    Preliminary AI Score: {selectedSubmission.aiAnalysis.overallPreliminaryScore}%
                  </span>
                </div>
              </div>
              <div className="p-5 space-y-3 text-xs">
                <p className="font-semibold">Timestamp-Linked AI Observations</p>
                {selectedSubmission.aiAnalysis.timelineMarkers.map((tm, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0">
                    <div>
                      <span className="font-mono-tech text-[#0284C7] dark:text-[#39D9FF] mr-2">
                        00:{String(tm.timestampSeconds).padStart(2, '0')}
                      </span>
                      <span className="font-semibold">{tm.label}:</span>{' '}
                      <span className="text-slate-600 dark:text-[#96A4BA]">{tm.observation}</span>
                    </div>
                    <span
                      className={`shrink-0 font-semibold ${
                        tm.confidence === 'insufficient_evidence' ? 'text-amber-500' : 'text-emerald-500'
                      }`}
                    >
                      {tm.confidence === 'insufficient_evidence' ? 'Insufficient Evidence' : 'Verified Frame'}
                    </span>
                  </div>
                ))}

                {selectedSubmission.integrityCheck.riskLevel !== 'low' && (
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-600 dark:text-rose-300 flex items-start gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Integrity Radar Alert ({selectedSubmission.integrityCheck.riskLevel})</p>
                      <p className="mt-0.5">{selectedSubmission.integrityCheck.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Oral Transcript & Human Decision Form */}
            <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 space-y-5">
              <div>
                <h3 className="font-display text-base font-bold">Adaptive Oral Examination Transcript</h3>
                <p className="text-xs text-slate-500 dark:text-[#96A4BA] mt-0.5">
                  Status: {selectedSubmission.oralExam.status.replace('_', ' ')} · Score:{' '}
                  {selectedSubmission.oralExam.overallScore ?? 'Pending'}%
                </p>
              </div>

              {selectedSubmission.oralExam.turns.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-[#96A4BA]">
                  Apprentice has not completed the adaptive oral examination yet.
                </p>
              ) : (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {selectedSubmission.oralExam.turns.map((turn) => (
                    <div key={turn.id} className="rounded-xl bg-slate-50 dark:bg-[#131F35] p-3.5 text-xs space-y-1">
                      <p className="font-semibold">
                        Q{turn.turnNumber}: {turn.question}
                      </p>
                      <p className="text-slate-600 dark:text-[#96A4BA]">Answer: {turn.studentAnswer}</p>
                      <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                        AI Note ({turn.score}%): {turn.feedback}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
                <label className="block text-xs font-semibold">
                  Authorised Human Verification Decision & Notes
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Document observed practical competence, missing torque checks, or reassessment instructions..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#080D19] p-3 text-xs"
                />

                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    disabled={deciding}
                    onClick={() => handleDecision('approved')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Approve & Verify Competency</span>
                  </button>
                  <button
                    type="button"
                    disabled={deciding}
                    onClick={() => handleDecision('reassessment_requested')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-500 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Request Reassessment</span>
                  </button>
                  <button
                    type="button"
                    disabled={deciding}
                    onClick={() => handleDecision('rejected')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500 cursor-pointer"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Reject</span>
                  </button>
                </div>

                {selectedSubmission.reviewerNotes && (
                  <p className="text-xs text-slate-500 dark:text-[#96A4BA]">
                    Latest Sign-Off ({selectedSubmission.reviewerName}): “{selectedSubmission.reviewerNotes}”
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Integrity Radar Table */}
      {(activeTab === 'integrity' || activeTab === 'overview') && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">Assessment Integrity Radar</h2>
              <p className="text-xs text-slate-500 dark:text-[#96A4BA]">
                Automated digest & metadata flags never auto-penalize learners; all cases require human mentor review.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-[#96A4BA]">
                <tr>
                  <th className="py-2.5 pr-4">Apprentice</th>
                  <th className="py-2.5 pr-4">Competency</th>
                  <th className="py-2.5 pr-4">SHA-256 Digest</th>
                  <th className="py-2.5 pr-4">Challenge</th>
                  <th className="py-2.5 pr-4">Risk</th>
                  <th className="py-2.5">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70">
                {data.submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-[#131F35]/40">
                    <td className="py-3 pr-4 font-semibold">{sub.studentName}</td>
                    <td className="py-3 pr-4 font-mono-tech">{sub.competencyCode}</td>
                    <td className="py-3 pr-4 font-mono-tech text-slate-500">{sub.integrityCheck.fileHash.slice(0, 18)}...</td>
                    <td className="py-3 pr-4 font-mono-tech">{sub.integrityCheck.challengeCode}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`font-semibold ${
                          sub.integrityCheck.riskLevel === 'high'
                            ? 'text-rose-500'
                            : sub.integrityCheck.riskLevel === 'medium'
                            ? 'text-amber-500'
                            : 'text-emerald-500'
                        }`}
                      >
                        {sub.integrityCheck.riskLevel.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedSubId(sub.id)}
                        className="inline-flex items-center gap-1 text-[#0284C7] dark:text-[#39D9FF] font-semibold hover:underline cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Apprentices & Predictive Learning Behaviour Analytics */}
      {(activeTab === 'apprentices' || activeTab === 'analytics' || activeTab === 'overview') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 space-y-4">
            <h2 className="font-display text-lg font-bold">Cohort Risk & Recovery Plans</h2>
            <div className="space-y-3">
              {filteredApprentices.map((app) => (
                <div
                  key={app.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{app.name}</p>
                      <p className="text-slate-500 dark:text-[#96A4BA]">
                        {app.cohort} · {app.verifiedCount} Verified · {app.demonstratedCount} Pending Review
                      </p>
                    </div>
                    {app.risk && <RiskLabel level={app.risk.riskLevel} />}
                  </div>
                  {app.risk && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1 text-slate-600 dark:text-[#96A4BA]">
                      <p className="font-medium text-slate-800 dark:text-[#F4F7FC]">
                        Contributing Factors: {app.risk.factors.join(' · ')}
                      </p>
                      <p>Recommended Support: {app.risk.recommendations.join(' · ')}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 space-y-4">
            <h2 className="font-display text-lg font-bold">Cohort Competency Distribution</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#96A4BA" fontSize={12} />
                  <YAxis stroke="#96A4BA" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0E1628',
                      borderColor: '#1E293B',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="Verified" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Demonstrated" fill="#39D9FF" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Lessons" fill="#537CFF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
