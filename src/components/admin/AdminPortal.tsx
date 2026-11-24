import React, { useEffect, useState } from 'react';
import { Save, ShieldCheck } from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '../../context/AppContext.tsx';
import { MetricCard, SkeletonBlock } from '../ui/DesignPrimitives.tsx';
import type {
  AuditLog,
  Competency,
  LearningRiskRecord,
  PlatformSettings,
  PublicUser,
  SkillPassport,
  StudentCompetency,
  Trade,
  UserRole,
} from '../../types.ts';

interface AdminPayload {
  users: PublicUser[];
  trades: Trade[];
  competencies: Competency[];
  studentCompetencies: StudentCompetency[];
  settings: PlatformSettings;
  auditLogs: AuditLog[];
  riskRecords: LearningRiskRecord[];
  passports: SkillPassport[];
}

export const AdminPortal: React.FC<{ activeTab?: 'overview' | 'users' | 'settings' | 'audit' }> = ({
  activeTab = 'overview',
}) => {
  const { apiFetch, addToast } = useApp();
  const [data, setData] = useState<AdminPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [maxSkips, setMaxSkips] = useState(2);
  const [skipSeconds, setSkipSeconds] = useState(10);
  const [requireCheckpoint, setRequireCheckpoint] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadAdmin = () => {
    setLoading(true);
    apiFetch<AdminPayload>('/api/admin/overview')
      .then((res) => {
        setData(res);
        setMaxSkips(res.settings.maxForwardSkips);
        setSkipSeconds(res.settings.forwardSkipSeconds);
        setRequireCheckpoint(res.settings.requireCheckpointPass);
      })
      .catch((err) =>
        addToast({
          title: 'Failed to load Admin Console',
          message: err instanceof Error ? err.message : 'Error',
          variant: 'error',
        }),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAdmin();
  }, []);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          maxForwardSkips: maxSkips,
          forwardSkipSeconds: skipSeconds,
          requireCheckpointPass: requireCheckpoint,
        }),
      });
      addToast({ title: 'Institution Policy Updated', variant: 'success' });
      loadAdmin();
    } catch (err) {
      addToast({ title: 'Update Failed', message: err instanceof Error ? err.message : 'Error', variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const updateUserRole = async (userId: string, role: UserRole) => {
    try {
      await apiFetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      addToast({ title: 'Role Updated', variant: 'success' });
      loadAdmin();
    } catch (err) {
      addToast({ title: 'Failed to Update Role', message: err instanceof Error ? err.message : 'Error', variant: 'error' });
    }
  };

  if (loading || !data) return <SkeletonBlock rows={6} />;

  const heatmapData = data.competencies.slice(0, 6).map((c) => {
    const records = data.studentCompetencies.filter((sc) => sc.competencyId === c.id);
    return {
      code: c.code,
      Verified: records.filter((r) => r.state === 'verified').length,
      Demonstrated: records.filter((r) => r.state === 'demonstrated').length,
      Learning: records.filter((r) => r.state === 'learned' || r.state === 'practised').length,
    };
  });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Registered Accounts" value={data.users.length} detail="Across 5 platform roles" tone="cyan" />
        <MetricCard label="Vocational Trades" value={data.trades.length} detail="Active curriculum frameworks" />
        <MetricCard
          label="Active Skill Passports"
          value={data.passports.filter((p) => p.status === 'active').length}
          detail="Public QR verification enabled"
          tone="emerald"
        />
        <MetricCard
          label="Skip Policy Limit"
          value={`${data.settings.maxForwardSkips} skips`}
          detail={`Max +${data.settings.forwardSkipSeconds}s per action`}
          tone="amber"
        />
      </div>

      {/* Cohort Heatmap Analytics */}
      {(activeTab === 'overview') && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 space-y-4">
          <h2 className="font-display text-lg font-bold">Institution Competency Heatmap</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={heatmapData}>
                <XAxis dataKey="code" stroke="#96A4BA" fontSize={12} />
                <YAxis stroke="#96A4BA" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0E1628',
                    borderColor: '#1E293B',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="Verified" stackId="a" fill="#10B981" />
                <Bar dataKey="Demonstrated" stackId="a" fill="#39D9FF" />
                <Bar dataKey="Learning" stackId="a" fill="#537CFF" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Video Skip Policy Settings */}
      {(activeTab === 'settings' || activeTab === 'overview') && (
        <form
          onSubmit={saveSettings}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 space-y-5"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#0284C7] dark:text-[#39D9FF]" />
            <h2 className="font-display text-lg font-bold">Video Playback & Assessment Policy</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-medium text-slate-600 dark:text-[#96A4BA] mb-1.5">
                Allowed Forward Skips Before 00:00 Reset
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={maxSkips}
                onChange={(e) => setMaxSkips(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#080D19] px-3 py-2 font-mono-tech"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 dark:text-[#96A4BA] mb-1.5">
                Seconds Per Forward Skip
              </label>
              <input
                type="number"
                min={5}
                max={30}
                value={skipSeconds}
                onChange={(e) => setSkipSeconds(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#080D19] px-3 py-2 font-mono-tech"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="checkbox"
                  checked={requireCheckpoint}
                  onChange={(e) => setRequireCheckpoint(e.target.checked)}
                />
                <span>Require Checkpoint Pass (≥70%)</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#0284C7] dark:bg-[#39D9FF] text-white dark:text-[#080D19] text-xs font-semibold cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saving ? 'Saving Policy...' : 'Save Policy Rules'}</span>
          </button>
        </form>
      )}

      {/* User & Role Management */}
      {(activeTab === 'users' || activeTab === 'overview') && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 space-y-4">
          <h2 className="font-display text-lg font-bold">User & Role Governance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-[#96A4BA]">
                <tr>
                  <th className="py-2.5 pr-4">Name</th>
                  <th className="py-2.5 pr-4">Email</th>
                  <th className="py-2.5 pr-4">Institution / Cohort</th>
                  <th className="py-2.5">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70">
                {data.users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 pr-4 font-semibold">{u.name}</td>
                    <td className="py-3 pr-4 font-mono-tech text-slate-500">{u.email}</td>
                    <td className="py-3 pr-4">
                      {u.institution} · {u.cohort}
                    </td>
                    <td className="py-3">
                      <select
                        value={u.role}
                        onChange={(e) => updateUserRole(u.id, e.target.value as UserRole)}
                        className="rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#080D19] px-2.5 py-1 text-xs font-semibold"
                      >
                        <option value="apprentice">Apprentice</option>
                        <option value="mentor">Mentor</option>
                        <option value="assessor">Assessor</option>
                        <option value="employer">Employer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Audit Logs */}
      {(activeTab === 'audit' || activeTab === 'overview') && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 space-y-4">
          <h2 className="font-display text-lg font-bold">Immutable Audit Trail</h2>
          <div className="space-y-2.5 max-h-72 overflow-y-auto text-xs">
            {data.auditLogs.map((log) => (
              <div key={log.id} className="rounded-lg bg-slate-50 dark:bg-[#131F35] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-mono-tech text-[#0284C7] dark:text-[#39D9FF] mr-2">{log.action}</span>
                  <span className="font-semibold">{log.actorName}</span> ({log.actorRole}) — {log.details}
                </div>
                <span className="font-mono-tech text-[11px] text-slate-500 shrink-0">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
