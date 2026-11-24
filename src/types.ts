export type UserRole = 'apprentice' | 'mentor' | 'assessor' | 'employer' | 'admin';

export type CompetencyState = 'learned' | 'practised' | 'demonstrated' | 'verified';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institution: string;
  tradeId: string;
  cohort: string;
  avatarUrl: string;
  createdAt: string;
}

export interface Trade {
  id: string;
  name: string;
  code: string;
  description: string;
  moduleCount: number;
  competencyCount: number;
  activeApprentices: number;
  imageUrl: string;
}

export interface LessonQuestion {
  id: string;
  timestampSeconds: number;
  prompt: string;
  expectedConcepts: string[];
  competencyCode: string;
}

export interface Lesson {
  id: string;
  moduleId: string;
  tradeId: string;
  order: number;
  title: string;
  summary: string;
  durationSeconds: number;
  prerequisiteLessonId: string | null;
  competencyId: string;
  pdfTitle: string;
  pdfSummary: string;
  checkpoints: LessonQuestion[];
  keyTakeaways: string[];
}

export interface Module {
  id: string;
  tradeId: string;
  order: number;
  title: string;
  description: string;
  estimatedHours: number;
  competencyIds: string[];
}

export interface LessonProgress {
  userId: string;
  lessonId: string;
  watchedSeconds: number;
  maxReachedSeconds: number;
  forwardSkipCount: number;
  resetCount: number;
  completed: boolean;
  passedCheckpoints: Record<string, {
    score: number;
    answer: string;
    feedback: string;
    strengths: string[];
    gaps: string[];
    mode: string;
    evaluatedAt: string;
  }>;
  updatedAt: string;
}

export interface Competency {
  id: string;
  code: string;
  tradeId: string;
  category: string;
  title: string;
  description: string;
  prerequisites: string[];
  rubricCriteria: string[];
}

export interface StudentCompetency {
  userId: string;
  competencyId: string;
  state: CompetencyState;
  learnedAt?: string;
  practisedAt?: string;
  demonstratedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  verifiedByName?: string;
  mentorNotes?: string;
  evidenceSubmissionId?: string;
}

export interface PracticalTask {
  id: string;
  tradeId: string;
  moduleId: string;
  competencyId: string;
  title: string;
  description: string;
  instructions: string[];
  safetyGuidelines: string[];
  requiredTools: string[];
  rubric: { criterion: string; weight: number }[];
  durationMinutes: number;
}

export interface TimelineMarker {
  timestampSeconds: number;
  label: string;
  category: 'tool' | 'action' | 'safety' | 'insufficient';
  observation: string;
  confidence: 'high' | 'medium' | 'insufficient_evidence';
}

export interface OralQuestionTurn {
  id: string;
  turnNumber: number;
  difficulty: 'foundational' | 'applied' | 'diagnostic';
  competencyCode: string;
  question: string;
  studentAnswer?: string;
  transcriptSource?: 'voice' | 'text';
  score?: number;
  feedback?: string;
  expectedConcepts?: string[];
  knowledgeGaps?: string[];
}

export interface PracticalSubmission {
  id: string;
  userId: string;
  studentName: string;
  tradeId: string;
  taskId: string;
  taskTitle: string;
  competencyId: string;
  competencyCode: string;
  mediaLabel: string;
  mediaType: 'demo_capture' | 'uploaded_video' | 'webcam_recording' | 'snapshot';
  fileHash: string;
  durationSeconds: number;
  isDemoSample: boolean;
  aiAnalysis: {
    mode: 'gemini-live' | 'error';
    model?: string;
    analyzedAt: string;
    overallPreliminaryScore: number;
    summary: string;
    detectedTools: string[];
    observedActions: string[];
    safetyObservations: string[];
    missingEvidence: string[];
    rubricResults: { criterion: string; status: 'observed' | 'partial' | 'insufficient_evidence'; notes: string }[];
    timelineMarkers: TimelineMarker[];
    disclaimer: string;
  };
  oralExam: {
    status: 'not_started' | 'in_progress' | 'completed';
    turns: OralQuestionTurn[];
    overallScore: number | null;
    summary?: string;
  };
  integrityCheck: {
    fileHash: string;
    duplicateFound: boolean;
    metadataStatus: 'verified' | 'review_recommended';
    challengeCode: string;
    riskLevel: 'low' | 'medium' | 'high';
    notes: string;
  };
  status: 'ai_analyzed' | 'oral_completed' | 'pending_review' | 'approved' | 'rejected' | 'reassessment_requested';
  reviewerId?: string;
  reviewerName?: string;
  reviewerRole?: UserRole;
  reviewerNotes?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface SkillPassport {
  passportId: string;
  userId: string;
  apprenticeName: string;
  institution: string;
  tradeId: string;
  tradeName: string;
  avatarUrl: string;
  issueDate: string;
  expiresAt: string;
  status: 'active' | 'pending' | 'revoked';
  approvedBy: string;
  verificationCount: number;
}

export interface LearningRiskRecord {
  userId: string;
  studentName: string;
  tradeId: string;
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number;
  factors: string[];
  recommendations: string[];
  updatedAt: string;
}

export interface IndustryProject {
  id: string;
  tradeId: string;
  title: string;
  industryPartner: string;
  problemStatement: string;
  toolsAndMaterials: string[];
  requiredCompetencyCodes: string[];
  difficulty: 'Intermediate' | 'Advanced' | 'Capstone';
  expectedOutcome: string;
  rubric: string[];
}

export interface ProjectSubmission {
  id: string;
  projectId: string;
  userId: string;
  notes: string;
  evidenceLabel: string;
  aiFeedback: string;
  status: 'submitted' | 'approved' | 'revision_requested';
  mentorNotes?: string;
  createdAt: string;
}

export interface EmployerRequest {
  id: string;
  employerId: string;
  employerName: string;
  companyName: string;
  apprenticeId: string;
  apprenticeName: string;
  message: string;
  status: 'sent' | 'accepted' | 'scheduled';
  createdAt: string;
}

export interface PlatformSettings {
  institutionName: string;
  maxForwardSkips: number;
  forwardSkipSeconds: number;
  requireCheckpointPass: boolean;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: 'assessment' | 'verification' | 'integrity' | 'system';
  read: boolean;
  createdAt: string;
}
