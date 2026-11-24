import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, ExternalLink, Mail, QrCode, Users } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../../context/AppContext.tsx';
import { AppImage, MetricCard, SkeletonBlock } from '../ui/DesignPrimitives.tsx';
import type { Competency, Trade } from '../../types.ts';

interface EmployerCandidate {
  id: string;
  name: string;
  institution: string;
  tradeId: string;
  tradeName: string;
  avatarUrl: string;
  passportId: string | null;
  passportStatus: string;
  verifiedCompetencies: {
    id: string;
    code: string;
    title: string;
    category: string;
    verifiedByName?: string;
    verifiedAt?: string;
  }[];
  avgPracticalScore: number | null;
  avgOralScore: number | null;
  approvedProjects: { id: string; title: string; partner: string }[];
}

export const EmployerPortal: React.FC<{
  activeTab?: 'discover' | 'compare';
  searchQuery?: string;
}> = ({ activeTab = 'discover', searchQuery = '' }) => {
  const { apiFetch, navigate, addToast } = useApp();
  const [candidates, setCandidates] = useState<EmployerCandidate[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(true);
  const [tradeFilter, setTradeFilter] = useState('all');
  const [compFilter, setCompFilter] = useState('all');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [contactCandidate, setContactCandidate] = useState<EmployerCandidate | null>(null);
  const [contactMessage, setContactMessage] = useState('');
  const [sendingReq, setSendingReq] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch<{ candidates: EmployerCandidate[]; trades: Trade[]; competencies: Competency[] }>(
      '/api/employer/candidates',
    )
      .then((res) => {
        setCandidates(res.candidates);
        setTrades(res.trades);
        setCompetencies(res.competencies);
        setCompareIds(res.candidates.slice(0, 2).map((c) => c.id));
      })
      .catch((err) =>
        addToast({
          title: 'Failed to load candidates',
          message: err instanceof Error ? err.message : 'Error',
          variant: 'error',
        }),
      )
      .finally(() => setLoading(false));
  }, []);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev,
    );
  };

  const sendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactCandidate || !contactMessage.trim()) return;
    setSendingReq(true);
    try {
      await apiFetch('/api/employer/request', {
        method: 'POST',
        body: JSON.stringify({ apprenticeId: contactCandidate.id, message: contactMessage }),
      });
      addToast({
        title: 'Authorised Inquiry Sent',
        message: `${contactCandidate.name} notified via APPRENTICE IQ.`,
        variant: 'success',
      });
      setContactCandidate(null);
      setContactMessage('');
    } catch (err) {
      addToast({
        title: 'Failed to Send Inquiry',
        message: err instanceof Error ? err.message : 'Error',
        variant: 'error',
      });
    } finally {
      setSendingReq(false);
    }
  };

  if (loading) return <SkeletonBlock rows={5} />;

  const filtered = candidates.filter((c) => {
    if (tradeFilter !== 'all' && c.tradeId !== tradeFilter) return false;
    if (compFilter !== 'all' && !c.verifiedCompetencies.some((vc) => vc.id === compFilter)) return false;
    if (
      searchQuery &&
      !c.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !c.tradeName.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const compared = candidates.filter((c) => compareIds.includes(c.id));
  const compareChartData = compared.map((c) => ({
    name: c.name.split(' ')[0],
    'Verified Skills': c.verifiedCompetencies.length,
    'Practical %': c.avgPracticalScore || 0,
    'Oral %': c.avgOralScore || 0,
  }));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Verified Talent Pool" value={candidates.length} detail="Active apprentice profiles" tone="cyan" />
        <MetricCard
          label="Active Skill Passports"
          value={candidates.filter((c) => c.passportStatus === 'active').length}
          detail="Human-verified credentials"
          tone="emerald"
        />
        <MetricCard
          label="Comparing Candidates"
          value={`${compared.length} / 3`}
          detail="Side-by-side competency matrix"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={tradeFilter}
          onChange={(e) => setTradeFilter(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0E1628] px-3 py-2 text-xs font-semibold"
        >
          <option value="all">All Trades</option>
          {trades.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          value={compFilter}
          onChange={(e) => setCompFilter(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0E1628] px-3 py-2 text-xs font-semibold"
        >
          <option value="all">All Verified Competencies</option>
          {competencies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} · {c.title}
            </option>
          ))}
        </select>
      </div>

      {activeTab === 'compare' && compared.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 space-y-6">
          <h2 className="font-display text-lg font-bold">Candidate Side-by-Side Comparison</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compareChartData}>
                <XAxis dataKey="name" stroke="#96A4BA" fontSize={12} />
                <YAxis stroke="#96A4BA" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0E1628',
                    borderColor: '#1E293B',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="Practical %" fill="#39D9FF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Oral %" fill="#537CFF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {compared.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 text-xs">
                <p className="font-display text-base font-bold">{c.name}</p>
                <p className="text-slate-500 dark:text-[#96A4BA]">{c.tradeName}</p>
                <p className="font-mono-tech text-emerald-500">
                  {c.verifiedCompetencies.length} Verified Competencies
                </p>
                <p>Practical Avg: {c.avgPracticalScore ?? 'Pending'}%</p>
                <p>Oral Avg: {c.avgOralScore ?? 'Pending'}%</p>
                <p>Approved Projects: {c.approvedProjects.length}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Candidate Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map((cand) => {
          const isCompared = compareIds.includes(cand.id);
          return (
            <div
              key={cand.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <AppImage
                    src={cand.avatarUrl}
                    alt={cand.name}
                    className="h-14 w-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                  />
                  <div>
                    <h3 className="font-display text-lg font-bold">{cand.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-[#96A4BA]">
                      {cand.tradeName} · {cand.institution}
                    </p>
                    <p className="mt-1 font-mono-tech text-[11px] text-[#0284C7] dark:text-[#39D9FF]">
                      Passport: {cand.passportId || 'Pending'} ({cand.passportStatus})
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleCompare(cand.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                    isCompared
                      ? 'border-[#0284C7] dark:border-[#39D9FF] bg-[#0284C7]/10 text-[#0284C7] dark:text-[#39D9FF]'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {isCompared ? 'In Comparison' : 'Compare'}
                </button>
              </div>

              <div className="space-y-1.5 text-xs">
                <p className="font-semibold">Human-Verified Competencies ({cand.verifiedCompetencies.length})</p>
                {cand.verifiedCompetencies.length === 0 ? (
                  <p className="text-slate-500 dark:text-[#96A4BA]">No verified competencies issued yet.</p>
                ) : (
                  <div className="space-y-1">
                    {cand.verifiedCompetencies.map((vc) => (
                      <div key={vc.id} className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          <span className="font-mono-tech mr-1">{vc.code}</span> {vc.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                {cand.passportId && (
                  <button
                    type="button"
                    onClick={() => navigate(`/verify/${cand.passportId}`)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0284C7] dark:bg-[#39D9FF] text-white dark:text-[#080D19] text-xs font-semibold cursor-pointer"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    <span>Verify Skill Passport</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setContactCandidate(cand)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-[#131F35] cursor-pointer"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Request Interview</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {contactCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={sendRequest}
            className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 space-y-4"
          >
            <h3 className="font-display text-lg font-bold">Contact {contactCandidate.name}</h3>
            <p className="text-xs text-slate-500 dark:text-[#96A4BA]">
              Messages are routed securely through APPRENTICE IQ without exposing personal phone numbers.
            </p>
            <textarea
              rows={4}
              required
              value={contactMessage}
              onChange={(e) => setContactMessage(e.target.value)}
              placeholder="Invite candidate to technical bench interview..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#080D19] p-3 text-xs"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setContactCandidate(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-500 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sendingReq}
                className="px-4 py-2 rounded-lg bg-[#0284C7] dark:bg-[#39D9FF] text-white dark:text-[#080D19] text-xs font-semibold cursor-pointer"
              >
                {sendingReq ? 'Sending...' : 'Send Inquiry'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
