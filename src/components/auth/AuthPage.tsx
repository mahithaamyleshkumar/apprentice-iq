import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Lock, Mail, UserCheck } from 'lucide-react';
import { defaultRouteForRole, useApp } from '../../context/AppContext.tsx';
import { BrandMark, ThemeToggle } from '../ui/DesignPrimitives.tsx';
import type { UserRole } from '../../types.ts';

const DEMO_ROLES: { role: UserRole; label: string; persona: string; summary: string }[] = [
  { role: 'apprentice', label: 'Apprentice', persona: 'Liam Vance · Electrician L3', summary: 'Lessons, Skill Vision, Oral Exam, Skill Map & Passport' },
  { role: 'mentor', label: 'Mentor', persona: 'Elena Rostova · Lead Electrical Mentor', summary: 'Review evidence, approve competencies & AI Mentor Assistant' },
  { role: 'assessor', label: 'Assessor', persona: 'Marcus Thorne · Trade Assessor', summary: 'Assessment queue, rubrics & audit-logged sign-off' },
  { role: 'employer', label: 'Employer', persona: 'Claire Bennett · GridCore Energy', summary: 'Candidate discovery, comparison & QR verification' },
  { role: 'admin', label: 'Institution Admin', persona: 'Dr. Aris Kapoor · Apex Technical Institute', summary: 'Skip policy rules, cohort analytics & audit logs' },
];

export const AuthPage: React.FC<{ initialMode?: 'login' | 'register' }> = ({ initialMode = 'login' }) => {
  const { login, demoLogin, register, navigate, addToast, isLoadingAuth } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('liam.vance@apextech.edu');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Exclude<UserRole, 'admin'>>('apprentice');
  const [tradeId, setTradeId] = useState('trd_electrician');
  const [institution, setInstitution] = useState('Apex Technical Institute');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'login') {
        const loggedUser = await login(email, password);
        addToast({ title: `Welcome back, ${loggedUser.name}`, variant: 'success' });
        navigate(defaultRouteForRole(loggedUser.role));
      } else {
        const registered = await register({ name, email, password, role, tradeId, institution });
        addToast({ title: 'Account created', message: `Signed in as ${registered.role}`, variant: 'success' });
        navigate(defaultRouteForRole(registered.role));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  const handleDemo = async (selectedRole: UserRole) => {
    setError('');
    try {
      const loggedUser = await demoLogin(selectedRole);
      addToast({
        title: `Signed in to ${selectedRole} portal`,
        message: `${loggedUser.name} · ${loggedUser.institution}`,
        variant: 'info',
      });
      navigate(defaultRouteForRole(loggedUser.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed');
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-[#F8FAFC] dark:bg-[#080D19]">
      {/* Left Brand & Mission Panel */}
      <div className="lg:col-span-5 bg-[#0E1628] text-[#F4F7FC] p-8 sm:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
        <div>
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => navigate('/')} className="cursor-pointer">
              <BrandMark />
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#96A4BA] hover:text-white cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Home</span>
            </button>
          </div>

          <h1 className="mt-12 font-display text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-balance">
            Proof of Skill. Not Just Proof of Training.
          </h1>
          <p className="mt-4 text-sm sm:text-base text-[#96A4BA] leading-relaxed">
            APPRENTICE IQ connects structured vocational learning, AI-assisted practical inspection, adaptive oral reasoning, and human mentor verification into one trusted credential.
          </p>

          <div className="mt-10 space-y-4 border-t border-slate-800 pt-8 text-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-[#39D9FF] mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-[#F4F7FC]">Role-Isolated Security</p>
                <p className="text-xs text-[#96A4BA]">Apprentices cannot approve their own competencies or issue passports.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-[#39D9FF] mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-[#F4F7FC]">Honest Computer Vision</p>
                <p className="text-xs text-[#96A4BA]">Unseen workbench actions are explicitly flagged as Insufficient Evidence.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-4 w-4 text-[#39D9FF] mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-[#F4F7FC]">Instant QR Verification</p>
                <p className="text-xs text-[#96A4BA]">Employers verify approved skills without exposing private videos.</p>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-10 text-xs text-[#96A4BA]">
          Apex Technical Institute Demo Environment · 7 Vocational Trades
        </p>
      </div>

      {/* Right Authentication & Quick Demo Switcher */}
      <div className="lg:col-span-7 p-6 sm:p-12 flex flex-col justify-center">
        <div className="mx-auto w-full max-w-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-1">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'bg-[#0284C7] dark:bg-[#39D9FF] text-white dark:text-[#080D19]'
                    : 'text-slate-600 dark:text-[#96A4BA]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  mode === 'register'
                    ? 'bg-[#0284C7] dark:bg-[#39D9FF] text-white dark:text-[#080D19]'
                    : 'text-slate-600 dark:text-[#96A4BA]'
                }`}
              >
                Create Account
              </button>
            </div>
            <ThemeToggle />
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 sm:p-8 space-y-4"
          >
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-[#F4F7FC]">
              {mode === 'login' ? 'Sign in to your portal' : 'Register a new account'}
            </h2>

            {error && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                {error}
              </div>
            )}

            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-[#96A4BA] mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Mercer"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#080D19] px-3.5 py-2.5 text-sm text-slate-900 dark:text-[#F4F7FC] focus:outline-none focus:border-[#39D9FF]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-[#96A4BA] mb-1.5">Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as Exclude<UserRole, 'admin'>)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#080D19] px-3 py-2.5 text-sm text-slate-900 dark:text-[#F4F7FC] focus:outline-none focus:border-[#39D9FF]"
                    >
                      <option value="apprentice">Apprentice</option>
                      <option value="mentor">Mentor</option>
                      <option value="assessor">Assessor</option>
                      <option value="employer">Employer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-[#96A4BA] mb-1.5">Primary Trade</label>
                    <select
                      value={tradeId}
                      onChange={(e) => setTradeId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#080D19] px-3 py-2.5 text-sm text-slate-900 dark:text-[#F4F7FC] focus:outline-none focus:border-[#39D9FF]"
                    >
                      <option value="trd_electrician">Electrician (EL-L3)</option>
                      <option value="trd_fitter">Mechanical Fitter</option>
                      <option value="trd_welder">Structural & TIG Welder</option>
                      <option value="trd_electronics">Electronics Technician</option>
                      <option value="trd_plumber">Plumber</option>
                      <option value="trd_mechanic">EV & Heavy Mechanic</option>
                      <option value="trd_computer">Network Operator</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-[#96A4BA] mb-1.5">Institution / Company</label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#080D19] px-3.5 py-2.5 text-sm text-slate-900 dark:text-[#F4F7FC] focus:outline-none focus:border-[#39D9FF]"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#96A4BA] mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#080D19] pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-[#F4F7FC] focus:outline-none focus:border-[#39D9FF]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-[#96A4BA] mb-1.5">Password</label>
              <div className="relative">
                <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password (or use Demo Role Access below)"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#080D19] pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-[#F4F7FC] focus:outline-none focus:border-[#39D9FF]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoadingAuth}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#0284C7] dark:bg-[#39D9FF] text-white dark:text-[#080D19] py-2.5 px-4 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              <span>{isLoadingAuth ? 'Authenticating...' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* One-Click Demo Role Access for Hackathon & Evaluation */}
          <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-[#0284C7] dark:text-[#39D9FF]" />
                <h3 className="font-display text-sm font-bold text-slate-900 dark:text-[#F4F7FC]">
                  Instant Demo Portal Access
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-[#96A4BA]">Seeded Demo Data</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DEMO_ROLES.map((item) => (
                <button
                  key={item.role}
                  type="button"
                  disabled={isLoadingAuth}
                  onClick={() => handleDemo(item.role)}
                  className="text-left rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#0284C7] dark:hover:border-[#39D9FF] bg-slate-50/70 dark:bg-[#131F35]/60 p-3 transition-colors cursor-pointer"
                >
                  <p className="text-xs font-bold text-slate-900 dark:text-[#F4F7FC]">{item.label}</p>
                  <p className="text-[11px] text-[#0284C7] dark:text-[#39D9FF] truncate mt-0.5">{item.persona}</p>
                  <p className="text-[11px] text-slate-500 dark:text-[#96A4BA] mt-1 line-clamp-1">{item.summary}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
