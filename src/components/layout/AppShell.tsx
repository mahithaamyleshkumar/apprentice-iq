import React, { useState } from 'react';
import {
  Award,
  Bell,
  BookOpen,
  Briefcase,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Eye,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Mic,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { defaultRouteForRole, useApp } from '../../context/AppContext.tsx';
import { BrandMark, ThemeToggle } from '../ui/DesignPrimitives.tsx';
import type { AppNotification, UserRole } from '../../types.ts';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

function getNavForRole(role: UserRole): NavItem[] {
  if (role === 'apprentice') {
    return [
      { label: 'Dashboard', path: '/apprentice/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: 'My Learning', path: '/apprentice/learning', icon: <BookOpen className="h-4 w-4" /> },
      { label: 'AI Copilot', path: '/apprentice/copilot', icon: <MessageSquare className="h-4 w-4" /> },
      { label: 'Skill Vision', path: '/apprentice/practical', icon: <Eye className="h-4 w-4" /> },
      { label: 'Oral Exam', path: '/apprentice/oral', icon: <Mic className="h-4 w-4" /> },
      { label: 'Skill Gap Map', path: '/apprentice/skill-map', icon: <GitBranch className="h-4 w-4" /> },
      { label: 'Skill Passport', path: '/apprentice/passport', icon: <Award className="h-4 w-4" /> },
      { label: 'Industry Projects', path: '/apprentice/projects', icon: <Briefcase className="h-4 w-4" /> },
    ];
  }
  if (role === 'mentor') {
    return [
      { label: 'Command Centre', path: '/mentor/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
      { label: 'Apprentices', path: '/mentor/apprentices', icon: <Users className="h-4 w-4" /> },
      { label: 'Evidence Reviews', path: '/mentor/reviews', icon: <CheckSquare className="h-4 w-4" /> },
      { label: 'Integrity Radar', path: '/mentor/integrity', icon: <ShieldAlert className="h-4 w-4" /> },
      { label: 'Risk Analytics', path: '/mentor/analytics', icon: <Sparkles className="h-4 w-4" /> },
    ];
  }
  if (role === 'assessor') {
    return [
      { label: 'Assessor Queue', path: '/assessor/dashboard', icon: <CheckSquare className="h-4 w-4" /> },
      { label: 'Integrity Radar', path: '/assessor/integrity', icon: <ShieldAlert className="h-4 w-4" /> },
      { label: 'Audit History', path: '/assessor/history', icon: <Award className="h-4 w-4" /> },
    ];
  }
  if (role === 'employer') {
    return [
      { label: 'Talent Discovery', path: '/employer/dashboard', icon: <Users className="h-4 w-4" /> },
      { label: 'Compare Candidates', path: '/employer/compare', icon: <GitBranch className="h-4 w-4" /> },
      { label: 'QR Verification', path: '/verify/IQ-EL-2026-8841', icon: <Award className="h-4 w-4" /> },
    ];
  }
  return [
    { label: 'Institution Overview', path: '/admin/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: 'Users & Roles', path: '/admin/users', icon: <Users className="h-4 w-4" /> },
    { label: 'Skip Policy & Rules', path: '/admin/settings', icon: <Settings className="h-4 w-4" /> },
    { label: 'Audit Logs', path: '/admin/audit', icon: <ShieldAlert className="h-4 w-4" /> },
  ];
}

export const AppShell: React.FC<{
  title: string;
  breadcrumb: string;
  notifications?: AppNotification[];
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  children: React.ReactNode;
}> = ({ title, breadcrumb, notifications = [], searchQuery, onSearchChange, children }) => {
  const { user, route, navigate, logout, demoLogin, addToast } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  if (!user) return null;

  const navItems = getNavForRole(user.role);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleRoleSwitch = async (nextRole: UserRole) => {
    try {
      const switched = await demoLogin(nextRole);
      addToast({ title: `Switched to ${nextRole} portal`, message: switched.name, variant: 'info' });
      navigate(defaultRouteForRole(switched.role));
    } catch (err) {
      addToast({
        title: 'Role switch failed',
        message: err instanceof Error ? err.message : 'Unable to switch',
        variant: 'error',
      });
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80">
          <button type="button" onClick={() => navigate('/')} className="cursor-pointer">
            <BrandMark compact={collapsed} />
          </button>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Toggle sidebar"
            className="hidden lg:inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#131F35] cursor-pointer"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const active = route === item.path || (item.path !== '/' && route.startsWith(item.path + '/'));
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-gradient-to-r from-[#0284C7]/15 to-[#537CFF]/10 dark:from-[#39D9FF]/15 dark:to-[#537CFF]/10 text-[#0284C7] dark:text-[#39D9FF] border border-[#0284C7]/25 dark:border-[#39D9FF]/25'
                    : 'text-slate-600 dark:text-[#96A4BA] hover:bg-slate-100 dark:hover:bg-[#131F35] hover:text-slate-950 dark:hover:text-[#F4F7FC]'
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-3 border-t border-slate-200 dark:border-slate-800/80 space-y-2.5">
        {!collapsed && (
          <div className="rounded-lg bg-slate-100/80 dark:bg-[#131F35]/70 p-2.5">
            <label className="block text-[10px] font-semibold text-slate-500 dark:text-[#96A4BA] mb-1">
              Demo Portal Switcher
            </label>
            <select
              value={user.role}
              onChange={(e) => handleRoleSwitch(e.target.value as UserRole)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#080D19] px-2 py-1.5 text-xs font-medium text-slate-900 dark:text-[#F4F7FC]"
            >
              <option value="apprentice">Apprentice Portal</option>
              <option value="mentor">Mentor Command Centre</option>
              <option value="assessor">Assessor Portal</option>
              <option value="employer">Employer Portal</option>
              <option value="admin">Institution Admin</option>
            </select>
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-[#96A4BA] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-[#080D19] text-slate-900 dark:text-[#F4F7FC]">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0E1628] transition-[width] duration-200 ${
          collapsed ? 'w-[72px]' : 'w-[256px]'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 max-w-[80vw] bg-white dark:bg-[#0E1628] border-r border-slate-200 dark:border-slate-800 z-10">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 px-4 sm:px-8 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-[#0E1628]/80 backdrop-blur-md flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-slate-500 dark:text-[#96A4BA] truncate">{breadcrumb}</p>
              <h1 className="font-display text-base sm:text-lg font-bold truncate">{title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {onSearchChange && (
              <div className="hidden md:flex items-center relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3" />
                <input
                  type="text"
                  value={searchQuery || ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search..."
                  className="w-48 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080D19] pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-[#39D9FF]"
                />
              </div>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotifs((s) => !s)}
                aria-label="Notifications"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] text-slate-600 dark:text-[#96A4BA] hover:text-slate-950 dark:hover:text-white cursor-pointer"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-[#0284C7] dark:bg-[#39D9FF] text-[10px] font-bold text-white dark:text-[#080D19] flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0E1628] shadow-2xl p-4 z-50">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-display text-xs font-bold">Notifications</p>
                    <button
                      type="button"
                      onClick={() => setShowNotifs(false)}
                      className="text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-[#96A4BA]">No new notifications.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-64 overflow-y-auto">
                      {notifications.map((n) => (
                        <div key={n.id} className="rounded-lg bg-slate-50 dark:bg-[#131F35] p-2.5 text-xs">
                          <p className="font-semibold">{n.title}</p>
                          <p className="mt-0.5 text-slate-600 dark:text-[#96A4BA]">{n.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <ThemeToggle />

            <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="text-right">
                <p className="text-xs font-semibold leading-tight">{user.name}</p>
                <p className="text-[11px] text-slate-500 dark:text-[#96A4BA] capitalize">{user.role}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-[1440px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};
