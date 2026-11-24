import React, { useEffect, useState } from 'react';
import { Award, Briefcase, CheckCircle2, ExternalLink, Send, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { AppImage, QrCodeCard } from '../ui/DesignPrimitives.tsx';
import type { ApprenticeBundle } from './ApprenticeDashboard.tsx';
import type { IndustryProject, ProjectSubmission } from '../../types.ts';

export const DigitalPassportView: React.FC<{ data: ApprenticeBundle }> = ({ data }) => {
  const { user, navigate } = useApp();
  if (!user) return null;

  const passport = data.passport;
  const verifiedComps = data.studentCompetencies
    .filter((sc) => sc.state === 'verified')
    .map((sc) => ({
      ...sc,
      comp: data.competencies.find((c) => c.id === sc.competencyId),
    }));

  const pendingComps = data.competencies.filter(
    (c) =>
      c.tradeId === user.tradeId &&
      !data.studentCompetencies.some((sc) => sc.competencyId === c.id && sc.state === 'verified'),
  );

  if (!passport) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-8 text-center">
        <Award className="h-10 w-10 text-[#0284C7] dark:text-[#39D9FF] mx-auto mb-3" />
        <h2 className="font-display text-lg font-bold">Digital Skill Passport Not Issued Yet</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-[#96A4BA]">
          Complete a practical demonstration and obtain Mentor verification to activate your QR Skill Passport.
        </p>
      </div>
    );
  }

  const verifyUrl = `${window.location.origin}/verify/${passport.passportId}`;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 sm:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <AppImage
              src={passport.avatarUrl}
              alt={passport.apprenticeName}
              className="h-20 w-20 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
            />
            <div>
              <p className="font-mono-tech text-xs text-[#0284C7] dark:text-[#39D9FF]">
                {passport.passportId} · Status: {passport.status.toUpperCase()}
              </p>
              <h2 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold">{passport.apprenticeName}</h2>
              <p className="text-sm text-slate-600 dark:text-[#96A4BA]">
                {passport.tradeName} · {passport.institution}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-[#96A4BA]">
                Approved by: {passport.approvedBy}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <QrCodeCard url={verifyUrl} size={132} />
            <button
              type="button"
              onClick={() => navigate(`/verify/${passport.passportId}`)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0284C7] dark:text-[#39D9FF] hover:underline cursor-pointer"
            >
              <span>Open Public Verification Page</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6">
          <h3 className="font-display text-lg font-bold mb-4">Human-Verified Competencies ({verifiedComps.length})</h3>
          {verifiedComps.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-[#96A4BA]">
              Awaiting mentor sign-off on demonstrated competencies.
            </p>
          ) : (
            <div className="space-y-3">
              {verifiedComps.map((item) => (
                <div key={item.competencyId} className="rounded-xl bg-slate-50 dark:bg-[#131F35] p-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono-tech text-[#0284C7] dark:text-[#39D9FF]">{item.comp?.code}</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Verified
                    </span>
                  </div>
                  <p className="mt-1 font-semibold text-sm">{item.comp?.title}</p>
                  <p className="mt-1 text-slate-500 dark:text-[#96A4BA]">
                    Signed off by {item.verifiedByName} · {item.mentorNotes}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6">
          <h3 className="font-display text-lg font-bold mb-4">Pending Competencies ({pendingComps.length})</h3>
          <p className="text-xs text-slate-500 dark:text-[#96A4BA] mb-3">
            Pending skills are strictly separated from verified credentials on employer verification views.
          </p>
          <div className="space-y-2.5">
            {pendingComps.slice(0, 6).map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between text-xs py-2 border-b border-slate-100 dark:border-slate-800/70 last:border-0"
              >
                <span>
                  <span className="font-mono-tech text-slate-500 mr-2">{c.code}</span>
                  {c.title}
                </span>
                <ShieldCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const IndustryProjectsView: React.FC = () => {
  const { apiFetch, addToast } = useApp();
  const [projects, setProjects] = useState<(IndustryProject & { matchPercentage: number })[]>([]);
  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [evidenceLabel, setEvidenceLabel] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadProjects = () => {
    apiFetch<{ projects: (IndustryProject & { matchPercentage: number })[]; submissions: ProjectSubmission[] }>('/api/projects')
      .then((res) => {
        setProjects(res.projects);
        setSubmissions(res.submissions);
      })
      .catch(() => undefined);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProjectId) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/projects/${activeProjectId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ evidenceLabel, notes }),
      });
      addToast({ title: 'Project Submitted', message: 'Queued for mentor evaluation.', variant: 'success' });
      setActiveProjectId('');
      setEvidenceLabel('');
      setNotes('');
      loadProjects();
    } catch (err) {
      addToast({
        title: 'Submission Failed',
        message: err instanceof Error ? err.message : 'Unable to submit project',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6">
        <p className="text-xs font-medium text-[#0284C7] dark:text-[#39D9FF]">Industry Project Recommendation Engine</p>
        <h2 className="mt-1 font-display text-2xl font-bold">Real-World Portfolio Projects</h2>
        <p className="mt-1 text-xs text-slate-600 dark:text-[#96A4BA]">
          Projects are matched to your verified competencies and skill gaps. Approved submissions appear on your Digital Skill Passport.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projects.map((proj) => {
          const existing = submissions.find((s) => s.projectId === proj.id);
          return (
            <div
              key={proj.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono-tech text-[#0284C7] dark:text-[#39D9FF]">
                    {proj.industryPartner} · {proj.difficulty}
                  </span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {proj.matchPercentage}% Skill Match
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold">{proj.title}</h3>
                <p className="text-xs text-slate-600 dark:text-[#96A4BA] leading-relaxed">{proj.problemStatement}</p>
                <div className="text-xs">
                  <p className="font-semibold mb-1">Required Competencies</p>
                  <p className="font-mono-tech text-slate-500 dark:text-[#96A4BA]">
                    {proj.requiredCompetencyCodes.join(' · ')}
                  </p>
                </div>
                <div className="text-xs">
                  <p className="font-semibold mb-1">Tools & Materials</p>
                  <p className="text-slate-600 dark:text-[#96A4BA]">{proj.toolsAndMaterials.join(', ')}</p>
                </div>
              </div>

              {existing ? (
                <div className="rounded-xl bg-slate-50 dark:bg-[#131F35] p-3.5 text-xs space-y-1">
                  <p className="font-semibold capitalize">Status: {existing.status.replace('_', ' ')}</p>
                  <p className="text-slate-600 dark:text-[#96A4BA]">{existing.aiFeedback}</p>
                  {existing.mentorNotes && (
                    <p className="text-emerald-600 dark:text-emerald-400">Mentor: {existing.mentorNotes}</p>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveProjectId(proj.id)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0284C7] dark:bg-[#39D9FF] text-white dark:text-[#080D19] text-xs font-semibold cursor-pointer"
                >
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>Accept & Submit Project Evidence</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {activeProjectId && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#0284C7] dark:border-[#39D9FF] bg-white dark:bg-[#0E1628] p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold">Submit Industry Project Evidence</h3>
            <button
              type="button"
              onClick={() => setActiveProjectId('')}
              className="text-xs text-slate-500 cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <input
            type="text"
            required
            value={evidenceLabel}
            onChange={(e) => setEvidenceLabel(e.target.value)}
            placeholder="Evidence title (e.g., Star-Delta Bench Test Photos & Commissioning Sheet)"
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#080D19] px-3.5 py-2 text-xs"
          />
          <textarea
            rows={3}
            required
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe measurements, wiring checks, and outcome..."
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#080D19] p-3 text-xs"
          />
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#0284C7] dark:bg-[#39D9FF] text-white dark:text-[#080D19] text-xs font-semibold cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>{submitting ? 'Submitting...' : 'Submit for Mentor Evaluation'}</span>
          </button>
        </form>
      )}
    </div>
  );
};
