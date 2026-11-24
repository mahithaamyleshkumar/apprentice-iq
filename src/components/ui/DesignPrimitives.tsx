import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Info,
  Moon,
  ShieldCheck,
  Sun,
  X,
  XCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import type { CompetencyState } from '../../types.ts';

export const BrandMark: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#39D9FF] to-[#537CFF] text-[#080D19] shadow-sm">
      <Cpu className="h-4 w-4 stroke-[2.2]" />
    </span>
    {!compact && (
      <span className="font-display text-lg font-extrabold tracking-tight text-slate-900 dark:text-[#F4F7FC]">
        APPRENTICE <span className="text-[#0284C7] dark:text-[#39D9FF]">IQ</span>
      </span>
    )}
  </span>
);

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useApp();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] text-slate-700 dark:text-[#96A4BA] hover:text-slate-950 dark:hover:text-[#F4F7FC] transition-colors shrink-0 cursor-pointer"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
};

export const AppImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}> = ({ src, alt, className = '', fallbackTitle }) => {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 dark:from-[#0E1628] dark:to-[#131F35] text-slate-600 dark:text-[#96A4BA] ${className}`}
      >
        <ShieldCheck className="h-8 w-8 opacity-60 mb-2" />
        <span className="text-xs font-medium px-3 text-center">{fallbackTitle || alt}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};

export const MetricCard: React.FC<{
  label: string;
  value: string | number;
  detail?: string;
  tone?: 'default' | 'cyan' | 'emerald' | 'amber' | 'rose';
}> = ({ label, value, detail, tone = 'default' }) => {
  const accentMap = {
    default: 'text-slate-900 dark:text-[#F4F7FC]',
    cyan: 'text-[#0284C7] dark:text-[#39D9FF]',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    rose: 'text-rose-600 dark:text-rose-400',
  };
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0E1628] p-5">
      <p className="text-xs font-medium text-slate-500 dark:text-[#96A4BA]">{label}</p>
      <p className={`mt-2 font-display text-2xl font-bold tabular-nums tracking-tight ${accentMap[tone]}`}>
        {value}
      </p>
      {detail && <p className="mt-1.5 text-xs text-slate-500 dark:text-[#96A4BA]">{detail}</p>}
    </div>
  );
};

export const CompetencyStateIndicator: React.FC<{ state: CompetencyState | 'not_started' }> = ({ state }) => {
  const config: Record<
    CompetencyState | 'not_started',
    { label: string; color: string; icon: React.ReactNode }
  > = {
    verified: {
      label: 'Verified',
      color: 'text-emerald-600 dark:text-emerald-400',
      icon: <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />,
    },
    demonstrated: {
      label: 'Demonstrated',
      color: 'text-[#0284C7] dark:text-[#39D9FF]',
      icon: <ShieldCheck className="h-3.5 w-3.5 shrink-0" />,
    },
    practised: {
      label: 'Practised',
      color: 'text-blue-600 dark:text-[#537CFF]',
      icon: <Clock className="h-3.5 w-3.5 shrink-0" />,
    },
    learned: {
      label: 'Learned',
      color: 'text-violet-600 dark:text-[#9A83FF]',
      icon: <Info className="h-3.5 w-3.5 shrink-0" />,
    },
    not_started: {
      label: 'Not Started',
      color: 'text-slate-400 dark:text-slate-500',
      icon: <Clock className="h-3.5 w-3.5 shrink-0" />,
    },
  };
  const item = config[state];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${item.color}`}>
      {item.icon}
      <span>{item.label}</span>
    </span>
  );
};

export const RiskLabel: React.FC<{ level: 'low' | 'medium' | 'high' }> = ({ level }) => {
  const map = {
    low: { text: 'Low Risk', cls: 'text-emerald-600 dark:text-emerald-400', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    medium: { text: 'Medium Risk', cls: 'text-amber-600 dark:text-amber-400', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
    high: { text: 'High Risk — Support Recommended', cls: 'text-rose-600 dark:text-rose-400', icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  };
  const cfg = map[level];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${cfg.cls}`}>
      {cfg.icon}
      <span>{cfg.text}</span>
    </span>
  );
};

export const QrCodeCard: React.FC<{ url: string; size?: number }> = ({ url, size = 148 }) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  useEffect(() => {
    QRCode.toDataURL(url, {
      width: size,
      margin: 1,
      color: { dark: '#080D19', light: '#FFFFFF' },
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(''));
  }, [url, size]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-lg bg-slate-200 dark:bg-[#131F35] animate-pulse"
      />
    );
  }

  return (
    <div className="inline-flex rounded-xl bg-white p-2.5 border border-slate-200 shadow-sm">
      <img src={dataUrl} alt={`Verification QR for ${url}`} width={size} height={size} className="block rounded" />
    </div>
  );
};

export const SkeletonBlock: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="h-12 w-full rounded-lg bg-slate-200/70 dark:bg-[#131F35] animate-pulse"
      />
    ))}
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
    <p className="font-display text-base font-semibold text-slate-900 dark:text-[#F4F7FC]">{title}</p>
    <p className="mt-1.5 text-sm text-slate-600 dark:text-[#96A4BA] max-w-md mx-auto">{description}</p>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-4 inline-flex items-center px-4 py-2 rounded-lg bg-[#0284C7] dark:bg-[#39D9FF] text-white dark:text-[#080D19] text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

export const ToastRegion: React.FC = () => {
  const { toasts, dismissToast } = useApp();
  if (!toasts.length) return null;

  const iconMap = {
    success: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />,
    error: <XCircle className="h-4 w-4 text-rose-500 shrink-0" />,
    info: <Info className="h-4 w-4 text-[#39D9FF] shrink-0" />,
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] p-4 shadow-xl"
        >
          {iconMap[t.variant]}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-[#F4F7FC]">{t.title}</p>
            {t.message && <p className="mt-0.5 text-xs text-slate-600 dark:text-[#96A4BA]">{t.message}</p>}
          </div>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss notification"
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
