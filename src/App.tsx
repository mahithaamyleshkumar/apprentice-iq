import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AppProvider, defaultRouteForRole, useApp } from './context/AppContext.tsx';
import { ToastRegion, SkeletonBlock } from './components/ui/DesignPrimitives.tsx';
import { LandingPage } from './components/public/LandingPage.tsx';
import { AuthPage } from './components/auth/AuthPage.tsx';
import { VerifyPassportPage } from './components/public/VerifyPassportPage.tsx';
import { AppShell } from './components/layout/AppShell.tsx';
import { ApprenticeDashboard, LearningHub, type ApprenticeBundle } from './components/apprentice/ApprenticeDashboard.tsx';
import { CustomVideoPlayer } from './components/apprentice/CustomVideoPlayer.tsx';
import { LearningCopilot } from './components/apprentice/LearningCopilot.tsx';
import { PracticalSkillVision } from './components/apprentice/PracticalSkillVision.tsx';
import { AdaptiveOralExam } from './components/apprentice/AdaptiveOralExam.tsx';
import { SkillGapMap } from './components/apprentice/SkillGapMap.tsx';
import { DigitalPassportView, IndustryProjectsView } from './components/apprentice/PassportAndProjects.tsx';
import { MentorCommandCentre } from './components/mentor/MentorCommandCentre.tsx';
import { EmployerPortal } from './components/employer/EmployerPortal.tsx';
import { AdminPortal } from './components/admin/AdminPortal.tsx';
import type { AppNotification, Competency, LearningRiskRecord, Lesson, LessonProgress, Module, PlatformSettings, PracticalSubmission, PracticalTask, SkillPassport, StudentCompetency, Trade } from './types.ts';

const ApprenticeRouter: React.FC<{ route: string }> = ({ route }) => {
  const { apiFetch, navigate, addToast } = useApp();
  const [bundle, setBundle] = useState<ApprenticeBundle | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [oralSubmissionId, setOralSubmissionId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    Promise.all([
      apiFetch<{
        trades: Trade[];
        modules: Module[];
        lessons: Lesson[];
        competencies: Competency[];
        practicalTasks: PracticalTask[];
        settings: PlatformSettings;
      }>('/api/curriculum'),
      apiFetch<{
        progress: LessonProgress[];
        competencies: StudentCompetency[];
        submissions: PracticalSubmission[];
        passport: SkillPassport | null;
        riskRecord: LearningRiskRecord | null;
        notifications: AppNotification[];
      }>('/api/apprentice/state'),
    ])
      .then(([curr, state]) => {
        setBundle({
          trades: curr.trades,
          modules: curr.modules,
          lessons: curr.lessons,
          competencies: curr.competencies,
          practicalTasks: curr.practicalTasks,
          settings: curr.settings,
          progress: state.progress,
          studentCompetencies: state.competencies,
          submissions: state.submissions,
          passport: state.passport,
          riskRecord: state.riskRecord,
        });
        setNotifications(state.notifications);
      })
      .catch((err) =>
        addToast({
          title: 'Failed to load workspace',
          message: err instanceof Error ? err.message : 'Error',
          variant: 'error',
        }),
      )
      .finally(() => setLoading(false));
  }, [apiFetch, addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  let title = 'Apprentice Dashboard';
  let breadcrumb = 'Apprentice Portal / Overview';
  let content: React.ReactNode = null;

  if (loading || !bundle) {
    content = <SkeletonBlock rows={6} />;
  } else if (route.startsWith('/apprentice/lesson/')) {
    const lessonId = route.replace('/apprentice/lesson/', '');
    const lesson = bundle.lessons.find((l) => l.id === lessonId) || bundle.lessons[0];
    const progress = bundle.progress.find((p) => p.lessonId === lesson.id);
    title = lesson.title;
    breadcrumb = 'Apprentice Portal / My Learning / Video Lesson';
    content = (
      <CustomVideoPlayer
        lesson={lesson}
        progress={progress}
        settings={bundle.settings}
        onRefresh={loadData}
      />
    );
  } else if (route === '/apprentice/learning') {
    title = 'Structured Learning Pathway';
    breadcrumb = 'Apprentice Portal / My Learning';
    content = <LearningHub data={bundle} />;
  } else if (route === '/apprentice/copilot') {
    title = 'AI Learning Copilot';
    breadcrumb = 'Apprentice Portal / Contextual Copilot';
    content = <LearningCopilot data={bundle} />;
  } else if (route === '/apprentice/practical') {
    title = 'AI Practical Skill Vision';
    breadcrumb = 'Apprentice Portal / Practical Intelligence';
    content = (
      <PracticalSkillVision
        data={bundle}
        onRefresh={loadData}
        onOpenOral={(subId) => {
          setOralSubmissionId(subId);
          navigate(`/apprentice/oral/${subId}`);
        }}
      />
    );
  } else if (route.startsWith('/apprentice/oral')) {
    const paramId = route.startsWith('/apprentice/oral/') ? route.replace('/apprentice/oral/', '') : oralSubmissionId;
    title = 'Adaptive AI Oral Examination';
    breadcrumb = 'Apprentice Portal / Oral Defense';
    content = <AdaptiveOralExam data={bundle} initialSubmissionId={paramId} onRefresh={loadData} />;
  } else if (route === '/apprentice/skill-map') {
    title = 'Skill Gap Intelligence Map';
    breadcrumb = 'Apprentice Portal / Competency Graph';
    content = <SkillGapMap data={bundle} />;
  } else if (route === '/apprentice/passport') {
    title = 'Digital Skill Passport';
    breadcrumb = 'Apprentice Portal / Verified Credential';
    content = <DigitalPassportView data={bundle} />;
  } else if (route === '/apprentice/projects') {
    title = 'Industry Project Recommendations';
    breadcrumb = 'Apprentice Portal / Portfolio Projects';
    content = <IndustryProjectsView />;
  } else {
    content = <ApprenticeDashboard data={bundle} onRefresh={loadData} />;
  }

  return (
    <AppShell title={title} breadcrumb={breadcrumb} notifications={notifications}>
      {content}
    </AppShell>
  );
};

const RouterView: React.FC = () => {
  const { user, route, navigate } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  // Public Routes
  if (route === '/' || route === '/about' || route === '/features' || route === '/how-it-works') {
    return <LandingPage />;
  }

  if (route === '/login') {
    return <AuthPage initialMode="login" />;
  }

  if (route === '/register') {
    return <AuthPage initialMode="register" />;
  }

  if (route.startsWith('/verify/')) {
    const passportId = decodeURIComponent(route.replace('/verify/', '').split('/')[0] || 'IQ-EL-2026-8841');
    return <VerifyPassportPage passportId={passportId} />;
  }

  // Protected Routes: redirect unauthenticated users to /login
  if (!user) {
    return <AuthPage initialMode="login" />;
  }

  // Role-based route guard
  if (route.startsWith('/apprentice') && user.role !== 'apprentice') {
    navigate(defaultRouteForRole(user.role));
    return null;
  }
  if (route.startsWith('/mentor') && user.role !== 'mentor' && user.role !== 'admin') {
    navigate(defaultRouteForRole(user.role));
    return null;
  }
  if (route.startsWith('/assessor') && user.role !== 'assessor' && user.role !== 'admin') {
    navigate(defaultRouteForRole(user.role));
    return null;
  }
  if (route.startsWith('/employer') && user.role !== 'employer' && user.role !== 'admin') {
    navigate(defaultRouteForRole(user.role));
    return null;
  }
  if (route.startsWith('/admin') && user.role !== 'admin') {
    navigate(defaultRouteForRole(user.role));
    return null;
  }

  let view: React.ReactNode = null;

  if (route.startsWith('/apprentice')) {
    view = <ApprenticeRouter route={route} />;
  } else if (route.startsWith('/mentor')) {
    const tab =
      route === '/mentor/apprentices'
        ? 'apprentices'
        : route === '/mentor/reviews'
        ? 'reviews'
        : route === '/mentor/integrity'
        ? 'integrity'
        : route === '/mentor/analytics'
        ? 'analytics'
        : 'overview';
    view = (
      <AppShell
        title="Mentor Command Centre"
        breadcrumb={`Mentor Portal / ${tab.charAt(0).toUpperCase() + tab.slice(1)}`}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        <MentorCommandCentre activeTab={tab} portalRole="mentor" searchQuery={searchQuery} />
      </AppShell>
    );
  } else if (route.startsWith('/assessor')) {
    const tab = route === '/assessor/integrity' ? 'integrity' : 'reviews';
    view = (
      <AppShell
        title="Assessor Verification Portal"
        breadcrumb="Assessor Portal / Assessment Queue"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        <MentorCommandCentre activeTab={tab} portalRole="assessor" searchQuery={searchQuery} />
      </AppShell>
    );
  } else if (route.startsWith('/employer')) {
    const tab = route === '/employer/compare' ? 'compare' : 'discover';
    view = (
      <AppShell
        title="Employer Talent Verification"
        breadcrumb={`Employer Portal / ${tab === 'compare' ? 'Compare Candidates' : 'Talent Discovery'}`}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      >
        <EmployerPortal activeTab={tab} searchQuery={searchQuery} />
      </AppShell>
    );
  } else if (route.startsWith('/admin')) {
    const tab =
      route === '/admin/users'
        ? 'users'
        : route === '/admin/settings'
        ? 'settings'
        : route === '/admin/audit'
        ? 'audit'
        : 'overview';
    view = (
      <AppShell
        title="Institution Administration"
        breadcrumb={`Admin Console / ${tab.charAt(0).toUpperCase() + tab.slice(1)}`}
      >
        <AdminPortal activeTab={tab} />
      </AppShell>
    );
  } else {
    navigate(defaultRouteForRole(user.role));
    return null;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={route}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.16 }}
      >
        {view}
      </motion.div>
    </AnimatePresence>
  );
};

export default function App() {
  return (
    <AppProvider>
      <RouterView />
      <ToastRegion />
    </AppProvider>
  );
}
