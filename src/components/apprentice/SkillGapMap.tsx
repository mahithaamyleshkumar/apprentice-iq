import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Eye, GitBranch } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { CompetencyStateIndicator } from '../ui/DesignPrimitives.tsx';
import type { ApprenticeBundle } from './ApprenticeDashboard.tsx';
import type { CompetencyState } from '../../types.ts';

export const SkillGapMap: React.FC<{ data: ApprenticeBundle }> = ({ data }) => {
  const { user, navigate } = useApp();
  const [statusFilter, setStatusFilter] = useState<'all' | CompetencyState | 'not_started'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string>(data.competencies[2]?.id || data.competencies[0]?.id || '');

  const tradeComps = useMemo(
    () => data.competencies.filter((c) => c.tradeId === (user?.tradeId || 'trd_electrician')),
    [data.competencies, user?.tradeId],
  );

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(tradeComps.map((c) => c.category)))],
    [tradeComps],
  );

  const getState = (compId: string): CompetencyState | 'not_started' =>
    data.studentCompetencies.find((sc) => sc.competencyId === compId)?.state || 'not_started';

  const filtered = tradeComps.filter((c) => {
    const st = getState(c.id);
    if (statusFilter !== 'all' && st !== statusFilter) return false;
    if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
    return true;
  });

  const selectedComp = tradeComps.find((c) => c.id === selectedId) || filtered[0] || tradeComps[0];
  const selectedRecord = selectedComp
    ? data.studentCompetencies.find((sc) => sc.competencyId === selectedComp.id)
    : undefined;
  const selectedEvidence = selectedRecord?.evidenceSubmissionId
    ? data.submissions.find((s) => s.id === selectedRecord.evidenceSubmissionId)
    : undefined;

  const counts = {
    verified: tradeComps.filter((c) => getState(c.id) === 'verified').length,
    demonstrated: tradeComps.filter((c) => getState(c.id) === 'demonstrated').length,
    practised: tradeComps.filter((c) => getState(c.id) === 'practised').length,
    learned: tradeComps.filter((c) => getState(c.id) === 'learned').length,
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#0284C7] dark:text-[#39D9FF]">AI Skill Gap Intelligence Map</p>
          <h2 className="mt-1 font-display text-2xl font-bold">Four-Stage Competency Graph</h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-[#96A4BA]">
            Click any competency node to inspect learning history, practical evidence, and mentor sign-off status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono-tech">
          <span className="text-emerald-600 dark:text-emerald-400">Verified: {counts.verified}</span>
          <span className="text-[#0284C7] dark:text-[#39D9FF]">Demonstrated: {counts.demonstrated}</span>
          <span className="text-blue-600 dark:text-[#537CFF]">Practised: {counts.practised}</span>
          <span className="text-violet-600 dark:text-[#9A83FF]">Learned: {counts.learned}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-slate-200/70 dark:bg-[#0E1628] border border-slate-200 dark:border-slate-800">
          {(['all', 'verified', 'demonstrated', 'practised', 'learned', 'not_started'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-white dark:bg-[#131F35] text-slate-950 dark:text-[#39D9FF] shadow-sm'
                  : 'text-slate-600 dark:text-[#96A4BA]'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0E1628] px-3 py-2 text-xs font-semibold"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'All Categories' : cat}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Competency Nodes Graph Grid */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 industrial-grid">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((comp) => {
              const st = getState(comp.id);
              const isSelected = selectedComp?.id === comp.id;
              const prereqCodes = comp.prerequisites
                .map((pid) => tradeComps.find((c) => c.id === pid)?.code)
                .filter(Boolean);

              const borderStyle =
                st === 'verified'
                  ? 'border-emerald-500/40'
                  : st === 'demonstrated'
                  ? 'border-[#39D9FF]/50'
                  : st === 'practised'
                  ? 'border-[#537CFF]/40'
                  : 'border-slate-200 dark:border-slate-800';

              return (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => setSelectedId(comp.id)}
                  className={`text-left rounded-xl border p-4 bg-white/95 dark:bg-[#080D19]/90 transition-all cursor-pointer ${borderStyle} ${
                    isSelected ? 'ring-2 ring-[#39D9FF]' : 'hover:border-slate-400 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-tech text-xs text-slate-500 dark:text-[#96A4BA]">{comp.code}</span>
                    <CompetencyStateIndicator state={st} />
                  </div>
                  <p className="mt-2 font-display text-sm font-bold">{comp.title}</p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-[#96A4BA]">
                    {comp.category}
                    {prereqCodes.length > 0 ? ` · Requires ${prereqCodes.join(', ')}` : ' · Foundation'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Competency Inspector */}
        {selectedComp && (
          <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 space-y-5">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono-tech text-xs text-[#0284C7] dark:text-[#39D9FF]">
                  {selectedComp.code} · {selectedComp.category}
                </span>
                <CompetencyStateIndicator state={getState(selectedComp.id)} />
              </div>
              <h3 className="mt-2 font-display text-xl font-bold">{selectedComp.title}</h3>
              <p className="mt-2 text-xs text-slate-600 dark:text-[#96A4BA] leading-relaxed">
                {selectedComp.description}
              </p>
            </div>

            {/* 4-Stage Timeline */}
            <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-4 text-xs">
              <p className="font-semibold">Progression Trail</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-slate-50 dark:bg-[#131F35] p-2.5">
                  <p className="text-slate-500 dark:text-[#96A4BA]">1. Learned</p>
                  <p className="font-mono-tech mt-0.5">
                    {selectedRecord?.learnedAt ? new Date(selectedRecord.learnedAt).toLocaleDateString() : 'Pending'}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-[#131F35] p-2.5">
                  <p className="text-slate-500 dark:text-[#96A4BA]">2. Practised</p>
                  <p className="font-mono-tech mt-0.5">
                    {selectedRecord?.practisedAt ? new Date(selectedRecord.practisedAt).toLocaleDateString() : 'Pending'}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-[#131F35] p-2.5">
                  <p className="text-slate-500 dark:text-[#96A4BA]">3. Demonstrated</p>
                  <p className="font-mono-tech mt-0.5">
                    {selectedRecord?.demonstratedAt ? new Date(selectedRecord.demonstratedAt).toLocaleDateString() : 'Pending'}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-[#131F35] p-2.5">
                  <p className="text-slate-500 dark:text-[#96A4BA]">4. Verified</p>
                  <p className="font-mono-tech mt-0.5 text-emerald-500">
                    {selectedRecord?.verifiedAt ? new Date(selectedRecord.verifiedAt).toLocaleDateString() : 'Awaiting Mentor'}
                  </p>
                </div>
              </div>
            </div>

            {/* Rubric & Evidence */}
            <div className="space-y-2 text-xs">
              <p className="font-semibold">Verification Rubric Criteria</p>
              {selectedComp.rubricCriteria.map((rc, i) => (
                <div key={i} className="flex items-start gap-2 text-slate-600 dark:text-[#96A4BA]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#0284C7] dark:text-[#39D9FF] shrink-0 mt-0.5" />
                  <span>{rc}</span>
                </div>
              ))}
            </div>

            {selectedRecord?.mentorNotes && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3.5 text-xs">
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                  Mentor Feedback ({selectedRecord.verifiedByName})
                </p>
                <p className="mt-1">{selectedRecord.mentorNotes}</p>
              </div>
            )}

            {selectedEvidence && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 text-xs">
                <p className="font-semibold">Linked Evidence: {selectedEvidence.taskTitle}</p>
                <p className="text-slate-500 dark:text-[#96A4BA] mt-0.5">
                  Skill Vision: {selectedEvidence.aiAnalysis.overallPreliminaryScore}% · Oral:{' '}
                  {selectedEvidence.oralExam.overallScore ?? 'Pending'}%
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => navigate('/apprentice/practical')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0284C7] dark:bg-[#39D9FF] text-white dark:text-[#080D19] text-xs font-semibold cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Submit Practical Evidence</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/apprentice/learning')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold cursor-pointer"
              >
                <GitBranch className="h-3.5 w-3.5" />
                <span>Review Related Lesson</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
