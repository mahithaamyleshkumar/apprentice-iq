import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { AppImage, BrandMark, QrCodeCard, SkeletonBlock, ThemeToggle } from '../ui/DesignPrimitives.tsx';

interface VerifyPayload {
  passport: {
    passportId: string;
    apprenticeName: string;
    institution: string;
    tradeName: string;
    avatarUrl: string;
    issueDate: string;
    expiresAt: string;
    status: 'active' | 'pending' | 'revoked';
    approvedBy: string;
    verificationCount: number;
  };
  verifiedCompetencies: {
    code: string;
    title: string;
    category: string;
    verifiedAt: string;
    verifiedByName: string;
    mentorNotes?: string;
  }[];
  pendingCompetencies: {
    code: string;
    title: string;
    category: string;
    currentStage: string;
  }[];
  approvedProjects: {
    id: string;
    title: string;
    industryPartner: string;
    mentorNotes?: string;
    approvedAt: string;
  }[];
  authorisedEvidenceSummaries: {
    competencyCode: string;
    taskTitle: string;
    practicalPreliminaryScore: number;
    oralScore: number | null;
    reviewedBy?: string;
    reviewedAt?: string;
  }[];
  disclaimer: string;
}

export const VerifyPassportPage: React.FC<{ passportId: string }> = ({ passportId }) => {
  const { navigate } = useApp();
  const [data, setData] = useState<VerifyPayload | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/verify/${encodeURIComponent(passportId)}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error || 'Passport verification failed');
        setData(json);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unable to verify passport'))
      .finally(() => setLoading(false));
  }, [passportId]);

  const currentUrl = `${window.location.origin}/verify/${passportId}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#080D19] text-slate-900 dark:text-[#F4F7FC]">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628]">
        <div className="mx-auto max-w-5xl px-6 py-3.5 flex items-center justify-between gap-4">
          <button type="button" onClick={() => navigate('/')} className="cursor-pointer">
            <BrandMark />
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-[#96A4BA] hover:text-slate-950 dark:hover:text-white cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Platform Home</span>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {loading ? (
          <SkeletonBlock rows={6} />
        ) : error || !data ? (
          <div className="rounded-2xl border border-rose-500/30 bg-white dark:bg-[#0E1628] p-8 text-center">
            <ShieldAlert className="h-10 w-10 text-rose-500 mx-auto mb-3" />
            <h1 className="font-display text-xl font-bold">Credential Not Found</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-[#96A4BA]">{error}</p>
            <button
              type="button"
              onClick={() => navigate('/verify/IQ-EL-2026-8841')}
              className="mt-5 px-4 py-2 rounded-lg bg-[#0284C7] dark:bg-[#39D9FF] text-white dark:text-[#080D19] text-xs font-semibold cursor-pointer"
            >
              View Sample Passport IQ-EL-2026-8841
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Credential Header Card */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 sm:p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <AppImage
                    src={data.passport.avatarUrl}
                    alt={data.passport.apprenticeName}
                    className="h-20 w-20 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2 text-xs font-mono-tech text-[#0284C7] dark:text-[#39D9FF]">
                      <span>{data.passport.passportId}</span>
                      <span>·</span>
                      <span
                        className={
                          data.passport.status === 'active'
                            ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                            : data.passport.status === 'revoked'
                            ? 'text-rose-500 font-semibold'
                            : 'text-amber-500 font-semibold'
                        }
                      >
                        {data.passport.status === 'active'
                          ? 'Active & Verified'
                          : data.passport.status === 'revoked'
                          ? 'Revoked'
                          : 'Pending Verification'}
                      </span>
                    </div>
                    <h1 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#F4F7FC]">
                      {data.passport.apprenticeName}
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-[#96A4BA]">
                      {data.passport.tradeName} · {data.passport.institution}
                    </p>
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-[#96A4BA]">
                      Authorised by {data.passport.approvedBy} · Valid until{' '}
                      {new Date(data.passport.expiresAt).toLocaleDateString()} · Verified {data.passport.verificationCount} times
                    </p>
                  </div>
                </div>
                <QrCodeCard url={currentUrl} size={120} />
              </div>
            </div>

            {/* Verified Competencies */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg font-bold">Human-Verified Competencies</h2>
                  <span className="font-mono-tech text-xs text-emerald-600 dark:text-emerald-400">
                    {data.verifiedCompetencies.length} Verified
                  </span>
                </div>
                {data.verifiedCompetencies.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-[#96A4BA]">
                    No competencies have received final mentor/assessor sign-off yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-slate-800">
                    {data.verifiedCompetencies.map((vc) => (
                      <div key={vc.code} className="py-3.5 first:pt-0 last:pb-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono-tech text-xs text-[#0284C7] dark:text-[#39D9FF]">{vc.code} · {vc.category}</span>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Verified
                          </span>
                        </div>
                        <p className="mt-1 font-semibold text-sm">{vc.title}</p>
                        <p className="mt-1 text-xs text-slate-600 dark:text-[#96A4BA]">
                          Signed off by {vc.verifiedByName} on {new Date(vc.verifiedAt).toLocaleDateString()}
                          {vc.mentorNotes ? ` — “${vc.mentorNotes}”` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {data.authorisedEvidenceSummaries.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
                    <h3 className="font-display text-sm font-bold mb-3">Authorised Assessment Summaries</h3>
                    <div className="space-y-2.5">
                      {data.authorisedEvidenceSummaries.map((ev, i) => (
                        <div key={i} className="rounded-lg bg-slate-50 dark:bg-[#131F35] p-3 text-xs flex items-center justify-between gap-4">
                          <div>
                            <p className="font-semibold">{ev.competencyCode} · {ev.taskTitle}</p>
                            <p className="text-slate-500 dark:text-[#96A4BA]">Reviewed by {ev.reviewedBy}</p>
                          </div>
                          <div className="text-right font-mono-tech shrink-0">
                            <p>Practical: {ev.practicalPreliminaryScore}%</p>
                            {ev.oralScore !== null && <p>Oral: {ev.oralScore}%</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Pending / In Progress & Portfolio */}
              <div className="lg:col-span-5 space-y-6">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-display text-base font-bold">In-Progress / Pending Skills</h2>
                    <Clock className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#96A4BA] mb-3">
                    Separated from verified skills; not yet approved for independent deployment.
                  </p>
                  <div className="space-y-2">
                    {data.pendingCompetencies.slice(0, 5).map((pc) => (
                      <div key={pc.code} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800/70 last:border-0">
                        <span className="truncate pr-2">
                          <span className="font-mono-tech text-slate-500 mr-1.5">{pc.code}</span>
                          {pc.title}
                        </span>
                        <span className="text-slate-500 dark:text-[#96A4BA] capitalize shrink-0">
                          {pc.currentStage.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6">
                  <h2 className="font-display text-base font-bold mb-3">Approved Project Portfolio</h2>
                  {data.approvedProjects.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-[#96A4BA]">No approved industry projects yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {data.approvedProjects.map((pr) => (
                        <div key={pr.id} className="rounded-lg bg-slate-50 dark:bg-[#131F35] p-3 text-xs">
                          <p className="font-semibold">{pr.title}</p>
                          <p className="text-[#0284C7] dark:text-[#39D9FF] mt-0.5">{pr.industryPartner}</p>
                          {pr.mentorNotes && <p className="text-slate-500 dark:text-[#96A4BA] mt-1">{pr.mentorNotes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-[#0E1628] p-4 flex items-start gap-3 text-xs text-slate-600 dark:text-[#96A4BA]">
              <ShieldCheck className="h-4 w-4 text-[#0284C7] dark:text-[#39D9FF] shrink-0 mt-0.5" />
              <p>{data.disclaimer}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
