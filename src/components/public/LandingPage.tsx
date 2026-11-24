import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  GitBranch,
  Mic,
  QrCode,
  ShieldCheck,
  Users,
  Briefcase,
  Building2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { AppImage, BrandMark, QrCodeCard, ThemeToggle } from '../ui/DesignPrimitives.tsx';

const JOURNEY_STEPS = [
  { step: '01', label: 'Learn', detail: 'Trade-specific modules with enforced skip-policy video playback' },
  { step: '02', label: 'Understand', detail: 'Embedded lesson checkpoints evaluated by contextual AI' },
  { step: '03', label: 'Practise', detail: 'Remedial pathways and Copilot coaching without dead ends' },
  { step: '04', label: 'Demonstrate', detail: 'Practical bench video evidence analyzed via Skill Vision' },
  { step: '05', label: 'Verify', detail: 'Authorised mentors and assessors sign off real competencies' },
  { step: '06', label: 'Prove', detail: 'QR-verified Digital Skill Passport trusted by employers' },
];

const VISION_PREVIEW_MARKERS = [
  { time: '00:12', label: 'Tool & PPE Check', note: 'Wiha VDE 1000V insulated screwdriver and Fluke multimeter detected on mat.', status: 'Observed' },
  { time: '00:34', label: 'DIN-Rail Routing', note: '40A isolator, 30mA RCCB, and MCB bank dressed with clean copper busbars.', status: 'Observed' },
  { time: '00:58', label: 'Ferrule Terminations', note: 'Bootlace ferrules seated cleanly into cage terminals with zero stray copper.', status: 'Observed' },
  { time: '01:50', label: 'Torque Calibration', note: 'Camera angle obscured torque click indicator — flagged as Requires Assessor Review.', status: 'Insufficient Evidence' },
];

export const LandingPage: React.FC = () => {
  const { navigate } = useApp();
  const [selectedMarker, setSelectedMarker] = useState(0);
  const [activeStage, setActiveStage] = useState(3);

  const verifyUrl = `${window.location.origin}/verify/IQ-EL-2026-8841`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#080D19] text-slate-900 dark:text-[#F4F7FC]">
      {/* Strict 3-Zone Top Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-[#F8FAFC]/90 dark:bg-[#080D19]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-3.5">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-left cursor-pointer shrink-0"
          >
            <BrandMark />
          </button>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-[#96A4BA]">
            <a href="#journey" className="hover:text-slate-950 dark:hover:text-[#F4F7FC] transition-colors whitespace-nowrap shrink-0">
              Platform
            </a>
            <a href="#skill-vision" className="hover:text-slate-950 dark:hover:text-[#F4F7FC] transition-colors whitespace-nowrap shrink-0">
              Skill Vision
            </a>
            <a href="#skill-passport" className="hover:text-slate-950 dark:hover:text-[#F4F7FC] transition-colors whitespace-nowrap shrink-0">
              Skill Passport
            </a>
            <a href="#roles" className="hover:text-slate-950 dark:hover:text-[#F4F7FC] transition-colors whitespace-nowrap shrink-0">
              Employers
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="px-4 py-2 rounded-lg bg-[#0284C7] dark:bg-[#39D9FF] text-white dark:text-[#080D19] text-xs font-semibold hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden industrial-grid border-b border-slate-200 dark:border-slate-800/80">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="lg:col-span-6 flex flex-col justify-center"
            >
              <p className="text-xs font-semibold tracking-wide text-[#0284C7] dark:text-[#39D9FF] mb-4">
                Proof of Skill · Not Just Proof of Training
              </p>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight leading-[1.08] text-balance text-slate-950 dark:text-[#F4F7FC]">
                Your Skills Deserve More Than a Certificate.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-[#96A4BA] max-w-xl leading-relaxed">
                Learn with intelligence. Demonstrate your abilities. Get your skills verified. Build a future employers can trust.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#0284C7] dark:bg-[#39D9FF] text-white dark:text-[#080D19] text-sm font-semibold hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer"
                >
                  <span>Get Started</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href="#skill-vision"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-800 dark:text-[#F4F7FC] hover:bg-slate-100 dark:hover:bg-[#131F35] transition-colors whitespace-nowrap"
                >
                  Explore the Platform
                </a>
              </div>

              <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800/80 grid grid-cols-3 gap-6">
                <div>
                  <p className="font-display text-2xl font-bold tabular-nums text-slate-900 dark:text-[#F4F7FC]">7 Trades</p>
                  <p className="text-xs text-slate-500 dark:text-[#96A4BA] mt-0.5">Electrician flagship pathway</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-bold tabular-nums text-[#0284C7] dark:text-[#39D9FF]">4 States</p>
                  <p className="text-xs text-slate-500 dark:text-[#96A4BA] mt-0.5">Learned to Human-Verified</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">QR Proof</p>
                  <p className="text-xs text-slate-500 dark:text-[#96A4BA] mt-0.5">Employer-ready registry</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="lg:col-span-6 relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-[#0E1628] min-h-[360px]"
            >
              <AppImage
                src="/src/assets/images/hero_electrical_lab_1795499740829.jpg"
                alt="Vocational electrical apprentice inspecting industrial switchgear"
                className="w-full h-full object-cover min-h-[360px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080D19]/90 via-[#080D19]/30 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-white/15 bg-[#080D19]/85 backdrop-blur-md p-4">
                <div className="flex items-center justify-between text-xs text-[#96A4BA]">
                  <span className="font-mono-tech text-[#39D9FF]">EL-101 · Safe Isolation Protocol</span>
                  <span>Human Mentor Sign-Off Required</span>
                </div>
                <p className="mt-1.5 text-sm font-semibold text-[#F4F7FC]">
                  Video completion never counts as skill proof. Competencies advance only through practical evidence and authorised verification.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 2 & 3: Problem & 6-Step Journey */}
      <section id="journey" className="mx-auto max-w-7xl px-6 py-20 border-b border-slate-200 dark:border-slate-800/80">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-[#F4F7FC]">
            Why Course Completion Is Broken in Vocational Training
          </h2>
          <p className="mt-3 text-base text-slate-600 dark:text-[#96A4BA]">
            Traditional LMS platforms issue a certificate when a learner clicks through videos and passes a multiple-choice quiz. Employers need to know whether an apprentice can actually isolate a feeder, wire a distribution board, and explain fault loop impedance safely.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {JOURNEY_STEPS.map((item, idx) => {
            const active = activeStage === idx;
            return (
              <button
                key={item.step}
                type="button"
                onClick={() => setActiveStage(idx)}
                className={`text-left rounded-xl border p-4 transition-colors cursor-pointer ${
                  active
                    ? 'border-[#0284C7] dark:border-[#39D9FF] bg-[#0284C7]/5 dark:bg-[#131F35]'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <span className="font-mono-tech text-xs text-[#0284C7] dark:text-[#39D9FF]">{item.step}</span>
                <p className="mt-1.5 font-display text-base font-bold text-slate-900 dark:text-[#F4F7FC]">{item.label}</p>
                <p className="mt-1.5 text-xs text-slate-600 dark:text-[#96A4BA] leading-relaxed">{item.detail}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Section 4 & 5: Signature Capabilities — Practical Skill Vision & Adaptive Oral */}
      <section id="skill-vision" className="mx-auto max-w-7xl px-6 py-20 border-b border-slate-200 dark:border-slate-800/80">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-[#0284C7] dark:text-[#39D9FF]">01. AI Practical Skill Vision</p>
                <h3 className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-[#F4F7FC]">
                  Timestamp-Linked Workbench Evidence Analysis
                </h3>
              </div>
              <Eye className="h-5 w-5 text-[#0284C7] dark:text-[#39D9FF] shrink-0" />
            </div>

            <div className="relative aspect-[16/10] bg-[#080D19]">
              <AppImage
                src="/src/assets/images/vision_switchgear_bench_1795499741948.jpg"
                alt="Single-phase distribution board practical evidence"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080D19]/90 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/15 bg-[#080D19]/85 backdrop-blur p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono-tech text-[#39D9FF]">
                    {VISION_PREVIEW_MARKERS[selectedMarker].time} · {VISION_PREVIEW_MARKERS[selectedMarker].label}
                  </span>
                  <span
                    className={
                      VISION_PREVIEW_MARKERS[selectedMarker].status === 'Insufficient Evidence'
                        ? 'text-amber-400 font-semibold'
                        : 'text-emerald-400 font-semibold'
                    }
                  >
                    {VISION_PREVIEW_MARKERS[selectedMarker].status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#F4F7FC]">{VISION_PREVIEW_MARKERS[selectedMarker].note}</p>
              </div>
            </div>

            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 dark:bg-[#080D19]/50">
              {VISION_PREVIEW_MARKERS.map((m, idx) => (
                <button
                  key={m.time}
                  type="button"
                  onClick={() => setSelectedMarker(idx)}
                  className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    selectedMarker === idx
                      ? 'border-[#0284C7] dark:border-[#39D9FF] bg-white dark:bg-[#131F35]'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-[#0E1628]'
                  }`}
                >
                  <p className="font-mono-tech text-[11px] text-[#0284C7] dark:text-[#39D9FF]">{m.time}</p>
                  <p className="mt-0.5 text-xs font-semibold truncate text-slate-900 dark:text-[#F4F7FC]">{m.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-[#537CFF]">02. Adaptive AI Oral Examiner</p>
                <Mic className="h-4 w-4 text-[#537CFF]" />
              </div>
              <h3 className="mt-1.5 font-display text-xl font-bold text-slate-900 dark:text-[#F4F7FC]">
                Questions Adapted to Your Actual Bench Work
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-[#96A4BA]">
                Instead of static multiple-choice quizzes, our examiner inspects your practical submission and conducts a live voice or text oral defense.
              </p>

              <div className="mt-5 space-y-3 text-xs border-t border-slate-200 dark:border-slate-800 pt-4">
                <div>
                  <p className="font-mono-tech text-[#0284C7] dark:text-[#39D9FF]">Q1 · Foundational · EL-104</p>
                  <p className="mt-1 font-medium text-slate-900 dark:text-[#F4F7FC]">
                    “Explain why you selected a 30mA RCCB upstream of the socket MCBs.”
                  </p>
                </div>
                <div className="pl-3 border-l border-slate-300 dark:border-slate-700 text-slate-600 dark:text-[#96A4BA]">
                  “To trip within milliseconds on earth leakage before a person suffers ventricular fibrillation.”
                </div>
                <div>
                  <p className="font-mono-tech text-[#9A83FF]">Q2 · Adaptive Follow-Up · Diagnostic</p>
                  <p className="mt-1 font-medium text-slate-900 dark:text-[#F4F7FC]">
                    “What happens if a 32A Type C MCB is fitted on a 1.5mm² lighting radial with high Zs?”
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">03. Skill Gap Intelligence Map</p>
                <GitBranch className="h-4 w-4 text-emerald-500" />
              </div>
              <h3 className="mt-1.5 font-display text-xl font-bold text-slate-900 dark:text-[#F4F7FC]">
                Four-Stage Competency Graph
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-[#96A4BA]">
                Every trade skill tracks independently across Learned, Practised, Demonstrated, and Mentor-Verified—preventing unverified shortcuts.
              </p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0284C7] dark:text-[#39D9FF] hover:underline cursor-pointer"
              >
                <span>Open Interactive Skill Map in Demo</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Section 7: Digital Skill Passport & Live QR */}
      <section id="skill-passport" className="mx-auto max-w-7xl px-6 py-20 border-b border-slate-200 dark:border-slate-800/80">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6">
            <p className="text-xs font-medium text-[#0284C7] dark:text-[#39D9FF]">Digital Skill Passport</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-[#F4F7FC]">
              Cryptographically Traceable Verification Employers Can Scan in Seconds
            </h2>
            <p className="mt-3 text-base text-slate-600 dark:text-[#96A4BA]">
              Scan the QR code or open the live verification portal to inspect verified Electrician competencies, mentor sign-offs, and authorised evidence summaries—without exposing private recordings.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/verify/IQ-EL-2026-8841')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0284C7] dark:bg-[#39D9FF] text-white dark:text-[#080D19] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
              >
                <QrCode className="h-4 w-4" />
                <span>Inspect Live Passport IQ-EL-2026-8841</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <p className="font-mono-tech text-xs text-[#0284C7] dark:text-[#39D9FF]">PASSPORT ID · IQ-EL-2026-8841</p>
                <h3 className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-[#F4F7FC]">Liam Vance</h3>
                <p className="text-sm text-slate-600 dark:text-[#96A4BA]">
                  Industrial & Commercial Electrician · Apex Technical Institute
                </p>
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>EL-101 Safe Isolation — Verified by Elena Rostova</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>EL-102 Protective Earthing — Verified by Marcus Thorne</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 dark:text-[#96A4BA]">
                    <ShieldCheck className="h-4 w-4" />
                    <span>EL-103 DB Assembly — Pending Assessor Sign-Off</span>
                  </div>
                </div>
              </div>
              <QrCodeCard url={verifyUrl} size={136} />
            </div>
          </div>
        </div>
      </section>

      {/* Section 8 & 9: Roles Ecosystem */}
      <section id="roles" className="mx-auto max-w-7xl px-6 py-20 border-b border-slate-200 dark:border-slate-800/80">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-[#F4F7FC]">
            Built for Every Stakeholder in Vocational Excellence
          </h2>
          <p className="mt-2 text-base text-slate-600 dark:text-[#96A4BA]">
            Five role-isolated portals working on one unified competency ledger.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6">
            <Users className="h-5 w-5 text-[#0284C7] dark:text-[#39D9FF]" />
            <h3 className="mt-4 font-display text-lg font-bold text-slate-900 dark:text-[#F4F7FC]">
              Mentors & Assessors
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-[#96A4BA]">
              Review timestamp-linked evidence, inspect oral transcripts, investigate Integrity Radar alerts, and issue final human competency approvals.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6">
            <Briefcase className="h-5 w-5 text-[#537CFF]" />
            <h3 className="mt-4 font-display text-lg font-bold text-slate-900 dark:text-[#F4F7FC]">
              Employers & Hiring Teams
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-[#96A4BA]">
              Search candidates by verified trade competencies, compare practical performance side-by-side, and verify QR credentials instantly.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-6">
            <Building2 className="h-5 w-5 text-[#9A83FF]" />
            <h3 className="mt-4 font-display text-lg font-bold text-slate-900 dark:text-[#F4F7FC]">
              Training Institutions
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-[#96A4BA]">
              Configure video skip policies, monitor cohort skill heatmaps and explainable risk indicators, and maintain immutable audit trails.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-7xl px-6 py-20 text-center">
        <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-[#F4F7FC] max-w-2xl mx-auto text-balance">
          Experience the Complete Apprentice-to-Employer Workflow
        </h2>
        <p className="mt-3 text-base text-slate-600 dark:text-[#96A4BA] max-w-xl mx-auto">
          Sign in with any of the five demo portals or register a new apprentice profile to test video checkpoints, Skill Vision, adaptive oral exams, and QR verification.
        </p>
        <div className="mt-7 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#0284C7] dark:bg-[#39D9FF] text-white dark:text-[#080D19] text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
          >
            <span>Launch APPRENTICE IQ</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 py-8 px-6">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-[#96A4BA]">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-800 dark:text-[#F4F7FC]">APPRENTICE IQ</span>
            <span>·</span>
            <span>Apex Technical Institute Demo Registry</span>
          </div>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => navigate('/verify/IQ-EL-2026-8841')}
              className="hover:text-slate-900 dark:hover:text-[#F4F7FC] cursor-pointer"
            >
              Verify Credential
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="hover:text-slate-900 dark:hover:text-[#F4F7FC] cursor-pointer"
            >
              Portal Sign In
            </button>
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </div>
  );
};
