import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  AppNotification,
  AuditLog,
  Competency,
  EmployerRequest,
  IndustryProject,
  LearningRiskRecord,
  Lesson,
  LessonProgress,
  Module,
  PlatformSettings,
  PracticalSubmission,
  PracticalTask,
  ProjectSubmission,
  PublicUser,
  SkillPassport,
  StudentCompetency,
  Trade,
  UserRole,
} from '../src/types.ts';
import { hashPassword } from './auth.ts';

export interface StoredUser extends PublicUser {
  passwordHash: string;
  passwordSalt: string;
}

export interface PlaybackEvent {
  id: string;
  userId: string;
  lessonId: string;
  eventType: 'play' | 'pause' | 'forward_skip' | 'backward_seek' | 'policy_reset' | 'checkpoint_passed' | 'completed';
  timestampSeconds: number;
  detail: string;
  createdAt: string;
}

export interface DatabaseState {
  users: StoredUser[];
  trades: Trade[];
  modules: Module[];
  lessons: Lesson[];
  lessonProgress: LessonProgress[];
  playbackEvents: PlaybackEvent[];
  competencies: Competency[];
  studentCompetencies: StudentCompetency[];
  practicalTasks: PracticalTask[];
  practicalSubmissions: PracticalSubmission[];
  skillPassports: SkillPassport[];
  learningRiskRecords: LearningRiskRecord[];
  industryProjects: IndustryProject[];
  projectSubmissions: ProjectSubmission[];
  employerRequests: EmployerRequest[];
  platformSettings: PlatformSettings;
  auditLogs: AuditLog[];
  notifications: AppNotification[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'apprentice_iq_db.json');

function createSeedState(): DatabaseState {
  const demoPassword = hashPassword('ApprenticeIQ2026!');
  const now = new Date().toISOString();
  const daysAgo = (d: number) => new Date(Date.now() - d * 86400_000).toISOString();

  const users: StoredUser[] = [
    {
      id: 'usr_apprentice_liam',
      name: 'Liam Vance',
      email: 'liam.vance@apextech.edu',
      passwordHash: demoPassword.hash,
      passwordSalt: demoPassword.salt,
      role: 'apprentice',
      institution: 'Apex Technical Institute',
      tradeId: 'trd_electrician',
      cohort: 'EL-2026-A',
      avatarUrl: '/src/assets/images/apprentice_portrait_1795499741960.jpg',
      createdAt: daysAgo(45),
    },
    {
      id: 'usr_apprentice_maya',
      name: 'Maya Lin',
      email: 'maya.lin@apextech.edu',
      passwordHash: demoPassword.hash,
      passwordSalt: demoPassword.salt,
      role: 'apprentice',
      institution: 'Apex Technical Institute',
      tradeId: 'trd_electrician',
      cohort: 'EL-2026-A',
      avatarUrl: '/src/assets/images/hero_electrical_lab_1795499740829.jpg',
      createdAt: daysAgo(42),
    },
    {
      id: 'usr_apprentice_noah',
      name: 'Noah Sterling',
      email: 'noah.sterling@apextech.edu',
      passwordHash: demoPassword.hash,
      passwordSalt: demoPassword.salt,
      role: 'apprentice',
      institution: 'Apex Technical Institute',
      tradeId: 'trd_fitter',
      cohort: 'MF-2026-B',
      avatarUrl: '/src/assets/images/trade_fabrication_lab_1795499743128.jpg',
      createdAt: daysAgo(38),
    },
    {
      id: 'usr_mentor_elena',
      name: 'Elena Rostova',
      email: 'elena.rostova@apextech.edu',
      passwordHash: demoPassword.hash,
      passwordSalt: demoPassword.salt,
      role: 'mentor',
      institution: 'Apex Technical Institute',
      tradeId: 'trd_electrician',
      cohort: 'Lead Electrical Mentor',
      avatarUrl: '/src/assets/images/hero_electrical_lab_1795499740829.jpg',
      createdAt: daysAgo(120),
    },
    {
      id: 'usr_assessor_marcus',
      name: 'Marcus Thorne',
      email: 'marcus.thorne@apextech.edu',
      passwordHash: demoPassword.hash,
      passwordSalt: demoPassword.salt,
      role: 'assessor',
      institution: 'Apex Technical Institute',
      tradeId: 'trd_electrician',
      cohort: 'Certified Trade Assessor',
      avatarUrl: '/src/assets/images/vision_switchgear_bench_1795499741948.jpg',
      createdAt: daysAgo(150),
    },
    {
      id: 'usr_employer_gridcore',
      name: 'Claire Bennett',
      email: 'hiring@gridcore.io',
      passwordHash: demoPassword.hash,
      passwordSalt: demoPassword.salt,
      role: 'employer',
      institution: 'GridCore Energy Systems',
      tradeId: 'trd_electrician',
      cohort: 'Technical Talent Lead',
      avatarUrl: '/src/assets/images/trade_fabrication_lab_1795499743128.jpg',
      createdAt: daysAgo(90),
    },
    {
      id: 'usr_admin_apex',
      name: 'Dr. Aris Kapoor',
      email: 'admin@apextech.edu',
      passwordHash: demoPassword.hash,
      passwordSalt: demoPassword.salt,
      role: 'admin',
      institution: 'Apex Technical Institute',
      tradeId: 'trd_electrician',
      cohort: 'Institution Director',
      avatarUrl: '/src/assets/images/hero_electrical_lab_1795499740829.jpg',
      createdAt: daysAgo(200),
    },
  ];

  const trades: Trade[] = [
    {
      id: 'trd_electrician',
      name: 'Industrial & Commercial Electrician',
      code: 'EL-L3',
      description: 'Safe isolation, single/three-phase switchgear assembly, protective device sizing, earthing verification, and fault diagnostics.',
      moduleCount: 4,
      competencyCount: 10,
      activeApprentices: 142,
      imageUrl: '/src/assets/images/hero_electrical_lab_1795499740829.jpg',
    },
    {
      id: 'trd_fitter',
      name: 'Precision Mechanical Fitter',
      code: 'MF-L3',
      description: 'Micrometer tolerance inspection, shaft alignment, bearing fitting, and hydraulic manifold assembly.',
      moduleCount: 3,
      competencyCount: 8,
      activeApprentices: 96,
      imageUrl: '/src/assets/images/trade_fabrication_lab_1795499743128.jpg',
    },
    {
      id: 'trd_welder',
      name: 'Structural & TIG Welder',
      code: 'WL-L3',
      description: 'TIG/MIG seam preparation, thermal distortion control, root penetration inspection, and non-destructive testing.',
      moduleCount: 3,
      competencyCount: 8,
      activeApprentices: 78,
      imageUrl: '/src/assets/images/trade_fabrication_lab_1795499743128.jpg',
    },
    {
      id: 'trd_electronics',
      name: 'Electronics & PLC Technician',
      code: 'ET-L3',
      description: 'Oscilloscope signal tracing, SMD rework, PLC ladder logic commissioning, and sensor calibration.',
      moduleCount: 3,
      competencyCount: 9,
      activeApprentices: 114,
      imageUrl: '/src/assets/images/vision_switchgear_bench_1795499741948.jpg',
    },
    {
      id: 'trd_plumber',
      name: 'Hydronic & Commercial Plumber',
      code: 'PL-L2',
      description: 'Press-fit copper manifolding, backflow prevention testing, pressure drop diagnostics, and thermal balancing.',
      moduleCount: 2,
      competencyCount: 7,
      activeApprentices: 64,
      imageUrl: '/src/assets/images/trade_fabrication_lab_1795499743128.jpg',
    },
    {
      id: 'trd_mechanic',
      name: 'EV & Heavy Vehicle Mechanic',
      code: 'AM-L3',
      description: 'High-voltage battery pack isolation, CAN-bus diagnostics, brake hydraulics, and drivetrain telemetry.',
      moduleCount: 3,
      competencyCount: 8,
      activeApprentices: 88,
      imageUrl: '/src/assets/images/hero_electrical_lab_1795499740829.jpg',
    },
    {
      id: 'trd_computer',
      name: 'Network & Systems Operator',
      code: 'CO-L2',
      description: 'Structured fiber/copper termination, rack power distribution, hardware diagnostics, and Linux server provisioning.',
      moduleCount: 2,
      competencyCount: 7,
      activeApprentices: 105,
      imageUrl: '/src/assets/images/trade_fabrication_lab_1795499743128.jpg',
    },
  ];

  const competencies: Competency[] = [
    {
      id: 'cmp_el_101',
      code: 'EL-101',
      tradeId: 'trd_electrician',
      category: 'Safety & Isolation',
      title: 'Lockout / Tagout & Safe Isolation',
      description: 'Verify zero-energy state using a calibrated two-pole voltage tester and proving unit (Test-Prove-Test protocol) before touching conductors.',
      prerequisites: [],
      rubricCriteria: ['PPE & insulated gloves worn', 'Correct circuit breaker identified & locked off', 'Proving unit verified before and after zero-voltage check'],
    },
    {
      id: 'cmp_el_102',
      code: 'EL-102',
      tradeId: 'trd_electrician',
      category: 'Testing & Earthing',
      title: 'Protective Earthing & Continuity Verification',
      description: 'Measure R1+R2 protective conductor continuity and main equipotential bonding resistance within statutory limits.',
      prerequisites: ['cmp_el_101'],
      rubricCriteria: ['Instrument test leads nulled prior to measurement', 'CPC continuity verified across all outlets', 'Resistance reading documented against threshold'],
    },
    {
      id: 'cmp_el_103',
      code: 'EL-103',
      tradeId: 'trd_electrician',
      category: 'Installation',
      title: 'Single-Phase Distribution Board Assembly',
      description: 'Mount DIN-rail switchgear, route phase/neutral/earth conductors neatly with ferrules, and torque terminal screws to specification.',
      prerequisites: ['cmp_el_101', 'cmp_el_102'],
      rubricCriteria: ['Clean conductor stripping with zero exposed copper outside terminals', 'Correct phase/neutral/earth bar termination', 'Torque screwdriver used on main busbar terminals'],
    },
    {
      id: 'cmp_el_104',
      code: 'EL-104',
      tradeId: 'trd_electrician',
      category: 'Protection Design',
      title: 'MCB & RCCB Protection Sizing',
      description: 'Select Type B/C miniature circuit breakers and 30mA residual current devices matched to conductor ampacity and fault loop impedance.',
      prerequisites: ['cmp_el_101'],
      rubricCriteria: ['Correct curve & rated current selected for load', '30mA RCD trip-time tested under 1x and 5x fault current', 'Discrimination maintained with upstream isolator'],
    },
    {
      id: 'cmp_el_105',
      code: 'EL-105',
      tradeId: 'trd_electrician',
      category: 'Installation',
      title: 'Conduit Containment & Cable Gland Termination',
      description: 'Bend 20mm PVC/steel conduit cleanly without kinking and terminate armoured/flex glands with strain relief.',
      prerequisites: ['cmp_el_103'],
      rubricCriteria: ['Accurate 90-degree bends matching layout blueprint', 'Secure saddle spacing and IP-rated gland seal', 'Deburred conduit edges protecting insulation'],
    },
    {
      id: 'cmp_el_106',
      code: 'EL-106',
      tradeId: 'trd_electrician',
      category: 'Diagnostics',
      title: 'Earth Fault Loop Impedance (Zs) Diagnostics',
      description: 'Perform live Zs testing safely to verify automatic disconnection times meet IEC 60364 standards.',
      prerequisites: ['cmp_el_102', 'cmp_el_104'],
      rubricCriteria: ['Safe probe placement during live loop check', 'Measured Zs compared to max 80% rule-of-thumb limit', 'Root cause diagnosed for high-impedance joints'],
    },
    {
      id: 'cmp_el_107',
      code: 'EL-107',
      tradeId: 'trd_electrician',
      category: 'Industrial Control',
      title: 'Three-Phase Motor Star-Delta Control Wiring',
      description: 'Wire main, star, and delta contactors with mechanical/electrical interlocking and thermal overload relay protection.',
      prerequisites: ['cmp_el_103', 'cmp_el_104'],
      rubricCriteria: ['Electrical interlock wired across NC auxiliary contacts', 'Timer relay transition interval calibrated', 'Overload relay dial matched to motor FLA'],
    },
    {
      id: 'cmp_el_108',
      code: 'EL-108',
      tradeId: 'trd_electrician',
      category: 'Testing & Earthing',
      title: '500V DC Insulation Resistance Testing',
      description: 'Isolate sensitive electronic loads and measure L-N, L-E, and N-E insulation resistance at 500V DC (>= 1.0 MOhm).',
      prerequisites: ['cmp_el_102'],
      rubricCriteria: ['Sensitive surges/dimmers disconnected before 500V injection', 'All conductor pairs tested and discharged', 'Results logged accurately'],
    },
    {
      id: 'cmp_el_109',
      code: 'EL-109',
      tradeId: 'trd_electrician',
      category: 'Industrial Control',
      title: 'Industrial Switchgear Commissioning',
      description: 'Execute cold-to-hot commissioning sequence, phase rotation verification, and thermal hotspot inspection.',
      prerequisites: ['cmp_el_106', 'cmp_el_107', 'cmp_el_108'],
      rubricCriteria: ['Phase sequence L1-L2-L3 verified with rotation meter', 'Thermal scan confirms balanced busbar load', 'Commissioning certificate signed off'],
    },
    {
      id: 'cmp_el_110',
      code: 'EL-110',
      tradeId: 'trd_electrician',
      category: 'Renewable Systems',
      title: 'Solar PV Inverter Grid Tie-In & DC Isolation',
      description: 'Terminate DC string isolators, Type B RCD protection, and bidirectional AC metering for commercial solar arrays.',
      prerequisites: ['cmp_el_104', 'cmp_el_108'],
      rubricCriteria: ['DC polarity verified prior to inverter connection', 'AC/DC warning labels applied cleanly', 'Anti-islanding shutdown verified'],
    },
  ];

  const modules: Module[] = [
    {
      id: 'mod_el_1',
      tradeId: 'trd_electrician',
      order: 1,
      title: 'Safe Isolation & Earthing Fundamentals',
      description: 'Zero-energy lockout/tagout protocols, two-pole proving, and protective earth continuity measurements.',
      estimatedHours: 6,
      competencyIds: ['cmp_el_101', 'cmp_el_102'],
    },
    {
      id: 'mod_el_2',
      tradeId: 'trd_electrician',
      order: 2,
      title: 'Distribution Board Assembly & Protection',
      description: 'DIN-rail switchgear architecture, MCB curve selection, 30mA RCCB protection, and torque termination.',
      estimatedHours: 8,
      competencyIds: ['cmp_el_103', 'cmp_el_104', 'cmp_el_105'],
    },
    {
      id: 'mod_el_3',
      tradeId: 'trd_electrician',
      order: 3,
      title: 'Live Diagnostics & Insulation Testing',
      description: '500V DC insulation resistance testing, earth fault loop impedance (Zs) diagnostics, and fault tracing.',
      estimatedHours: 7,
      competencyIds: ['cmp_el_106', 'cmp_el_108'],
    },
    {
      id: 'mod_el_4',
      tradeId: 'trd_electrician',
      order: 4,
      title: 'Industrial Motor Control & Grid Tie-In',
      description: 'Three-phase star-delta contactor interlocking, switchgear commissioning, and solar inverter grid tie-in.',
      estimatedHours: 10,
      competencyIds: ['cmp_el_107', 'cmp_el_109', 'cmp_el_110'],
    },
    {
      id: 'mod_mf_1',
      tradeId: 'trd_fitter',
      order: 1,
      title: 'Precision Metrology & Shaft Alignment',
      description: 'Vernier micrometer calibration, dial test indicator runout checks, and laser coupling alignment.',
      estimatedHours: 6,
      competencyIds: [],
    },
  ];

  const lessons: Lesson[] = [
    {
      id: 'les_el_101',
      moduleId: 'mod_el_1',
      tradeId: 'trd_electrician',
      order: 1,
      title: 'The Test-Prove-Test Safe Isolation Protocol',
      summary: 'Step-by-step demonstration of locking off a feeder, verifying a two-pole voltage indicator on a proving unit, testing dead across L-N, L-E, and N-E, and re-proving.',
      durationSeconds: 120,
      prerequisiteLessonId: null,
      competencyId: 'cmp_el_101',
      pdfTitle: 'IEC-60364 Safe Isolation Field Checklist (Demo)',
      pdfSummary: 'Covers 7-step isolation sequence, padlock tagging rules, CAT IV 600V probe requirements, and re-energization clearance.',
      keyTakeaways: [
        'Always verify your two-pole voltage tester on a known live proving unit both BEFORE and AFTER testing the isolated circuit.',
        'Never rely on a non-contact volt-stick alone to prove a circuit is dead.',
        'Apply a personal padlock and signed lockout tag with your name and timestamp.',
      ],
      checkpoints: [
        {
          id: 'chk_101_1',
          timestampSeconds: 38,
          competencyCode: 'EL-101',
          prompt: 'Before testing the isolated circuit conductors, what must you do with your two-pole voltage indicator and why?',
          expectedConcepts: ['proving unit', 'known live source', 'verify tester works', 'prevent false zero reading'],
        },
        {
          id: 'chk_101_2',
          timestampSeconds: 82,
          competencyCode: 'EL-101',
          prompt: 'After measuring 0V across L-N, L-E, and N-E, why is a second proving unit check mandatory?',
          expectedConcepts: ['confirm tester did not fail during test', 'battery or lead integrity', 'guarantee zero energy'],
        },
      ],
    },
    {
      id: 'les_el_102',
      moduleId: 'mod_el_1',
      tradeId: 'trd_electrician',
      order: 2,
      title: 'Protective Conductor Continuity (R1+R2) Testing',
      summary: 'Nulling test leads on a multifunction tester and measuring line-to-CPC resistance at the furthest outlet.',
      durationSeconds: 110,
      prerequisiteLessonId: 'les_el_101',
      competencyId: 'cmp_el_102',
      pdfTitle: 'Earthing & Continuity Reference Table (Demo)',
      pdfSummary: 'Standard copper conductor resistance per metre at 20C and lead-nulling procedure.',
      keyTakeaways: [
        'Always null (zero out) test lead resistance before recording continuity values.',
        'Cross-connect Line and CPC at the distribution board to measure R1+R2 directly at socket outlets.',
      ],
      checkpoints: [
        {
          id: 'chk_102_1',
          timestampSeconds: 42,
          competencyCode: 'EL-102',
          prompt: 'Why must you null your multimeter or multifunction tester leads before measuring R1+R2 continuity?',
          expectedConcepts: ['subtract lead resistance', 'accurate low-ohm measurement', 'avoid inflated Zs calculation'],
        },
      ],
    },
    {
      id: 'les_el_103',
      moduleId: 'mod_el_2',
      tradeId: 'trd_electrician',
      order: 1,
      title: 'Single-Phase Distribution Board Wiring & MCB Sizing',
      summary: 'Assembling a 40A main switch, 30mA RCCB, and Type B/C MCBs with ferrule terminations, neutral/earth busbars, and calibrated torque.',
      durationSeconds: 135,
      prerequisiteLessonId: 'les_el_101',
      competencyId: 'cmp_el_103',
      pdfTitle: 'Distribution Board Torque & Curve Guide (Demo)',
      pdfSummary: 'DIN-rail layout diagrams, Type B (3-5x In) vs Type C (5-10x In) tripping curves, and terminal torque specifications.',
      keyTakeaways: [
        'MCBs protect cable insulation against overcurrent and short circuits—not the connected appliance.',
        'Bootlace ferrules prevent stray copper strands on stranded flexible conductors inside cage terminals.',
        'Under-torqued terminals cause high-resistance heating; over-torqued terminals shear copper strands.',
      ],
      checkpoints: [
        {
          id: 'chk_103_1',
          timestampSeconds: 45,
          competencyCode: 'EL-104',
          prompt: 'Explain the primary purpose of a Miniature Circuit Breaker (MCB) and what happens if a 32A MCB is installed on a 1.5mm² lighting cable.',
          expectedConcepts: ['overcurrent and short circuit protection', 'protects cable', 'cable ampacity exceeded', 'overheating and fire hazard before breaker trips'],
        },
        {
          id: 'chk_103_2',
          timestampSeconds: 95,
          competencyCode: 'EL-103',
          prompt: 'Why do we use a calibrated torque screwdriver and bootlace ferrules when terminating busbar and MCB connections?',
          expectedConcepts: ['prevent loose high-resistance connections', 'avoid thermal arcing', 'contain wire strands', 'manufacturer specification'],
        },
      ],
    },
    {
      id: 'les_el_104',
      moduleId: 'mod_el_3',
      tradeId: 'trd_electrician',
      order: 1,
      title: '500V DC Insulation Resistance & Fault Loop Diagnostics',
      summary: 'Safely isolating surge protection and electronic dimmers before 500V DC megaohm testing, followed by live Zs verification.',
      durationSeconds: 120,
      prerequisiteLessonId: 'les_el_103',
      competencyId: 'cmp_el_108',
      pdfTitle: 'Insulation Resistance & Zs Threshold Chart (Demo)',
      pdfSummary: 'Minimum 1.0 MOhm rule, voltage test levels (250V/500V/1000V), and temperature correction factors.',
      keyTakeaways: [
        'Disconnect SPDs, smart relays, and LED drivers before applying 500V DC across L-N.',
        'Verify at least 1.0 MOhm insulation resistance before energizing a new circuit.',
      ],
      checkpoints: [
        {
          id: 'chk_104_1',
          timestampSeconds: 50,
          competencyCode: 'EL-108',
          prompt: 'What precaution must you take with electronic dimmers or surge protection devices prior to running a 500V DC insulation resistance test?',
          expectedConcepts: ['disconnect sensitive electronics', 'link L and N to earth test or isolate load', 'prevent 500V damage and false low reading'],
        },
      ],
    },
  ];

  const lessonProgress: LessonProgress[] = [
    {
      userId: 'usr_apprentice_liam',
      lessonId: 'les_el_101',
      watchedSeconds: 120,
      maxReachedSeconds: 120,
      forwardSkipCount: 0,
      resetCount: 0,
      completed: true,
      passedCheckpoints: {
        chk_101_1: {
          score: 94,
          answer: 'Test the two-pole indicator on a known proving unit first so we confirm the LEDs and probes work and do not show a false 0V reading.',
          feedback: 'Accurate explanation of the Prove step in Test-Prove-Test.',
          strengths: ['Identified false-zero risk', 'Named proving unit'],
          gaps: [],
          mode: 'demo-seed',
          evaluatedAt: daysAgo(12),
        },
        chk_101_2: {
          score: 91,
          answer: 'Re-testing on the proving unit afterwards confirms the meter did not fail or lose battery mid-inspection.',
          feedback: 'Strong understanding of post-test verification.',
          strengths: ['Highlighted mid-test failure check'],
          gaps: [],
          mode: 'demo-seed',
          evaluatedAt: daysAgo(12),
        },
      },
      updatedAt: daysAgo(12),
    },
    {
      userId: 'usr_apprentice_liam',
      lessonId: 'les_el_102',
      watchedSeconds: 110,
      maxReachedSeconds: 110,
      forwardSkipCount: 1,
      resetCount: 0,
      completed: true,
      passedCheckpoints: {
        chk_102_1: {
          score: 89,
          answer: 'Nulling subtracts the resistance of the test leads themselves so we only measure the circuit copper resistance.',
          feedback: 'Clear and concise.',
          strengths: ['Correctly identified lead resistance subtraction'],
          gaps: [],
          mode: 'demo-seed',
          evaluatedAt: daysAgo(9),
        },
      },
      updatedAt: daysAgo(9),
    },
    {
      userId: 'usr_apprentice_liam',
      lessonId: 'les_el_103',
      watchedSeconds: 40,
      maxReachedSeconds: 40,
      forwardSkipCount: 0,
      resetCount: 0,
      completed: false,
      passedCheckpoints: {},
      updatedAt: daysAgo(1),
    },
    {
      userId: 'usr_apprentice_maya',
      lessonId: 'les_el_101',
      watchedSeconds: 32,
      maxReachedSeconds: 32,
      forwardSkipCount: 2,
      resetCount: 2,
      completed: false,
      passedCheckpoints: {},
      updatedAt: daysAgo(3),
    },
  ];

  const practicalTasks: PracticalTask[] = [
    {
      id: 'tsk_el_db_assembly',
      tradeId: 'trd_electrician',
      moduleId: 'mod_el_2',
      competencyId: 'cmp_el_103',
      title: 'Single-Phase Distribution Board Assembly & Isolation Check',
      description: 'Assemble, wire, and torque-verify a 6-way single-phase distribution board incorporating a 40A main isolator, 30mA RCCB, and Type B/C MCBs with earth/neutral busbars.',
      instructions: [
        'Perform full Test-Prove-Test safe isolation on the workbench supply feed before mounting switchgear.',
        'Mount 40A main switch, 30mA RCCB, and 4 MCBs securely onto the DIN rail.',
        'Terminate Line, Neutral, and CPC (earth) conductors to their respective busbars using bootlace ferrules.',
        'Torque all terminal screws to manufacturer specification and verify zero exposed copper outside collars.',
        'Hold your completed distribution board and digital multimeter clearly in frame for 3 seconds.',
      ],
      safetyGuidelines: [
        'Safety glasses and insulated Category III/IV tools must remain visible during work.',
        'Ensure workbench supply isolator is locked OFF during conductor stripping and termination.',
        'Inspect all wire insulation for nicks before clamping busbar screws.',
      ],
      requiredTools: [
        'Insulated VDE Screwdriver Set (e.g., Wiha)',
        'Digital Multimeter / Two-Pole Voltage Tester',
        'Bootlace Ferrule Crimper & Wire Strippers',
        'Calibrated Torque Screwdriver',
        'Safety Glasses',
      ],
      rubric: [
        { criterion: 'PPE & Insulated Tool Usage', weight: 20 },
        { criterion: 'DIN-Rail Switchgear & Busbar Routing', weight: 30 },
        { criterion: 'Conductor Stripping & Ferrule Termination Quality', weight: 25 },
        { criterion: 'Zero-Voltage Verification Before Handling', weight: 25 },
      ],
      durationMinutes: 25,
    },
    {
      id: 'tsk_el_isolation',
      tradeId: 'trd_electrician',
      moduleId: 'mod_el_1',
      competencyId: 'cmp_el_101',
      title: 'Feeder Lockout/Tagout & Proving Unit Sequence',
      description: 'Demonstrate end-to-end safe isolation on Feeder B including lockout padlock application and Test-Prove-Test verification.',
      instructions: [
        'Verify two-pole voltage tester on proving unit.',
        'Isolate feeder breaker and install personal padlock + tag.',
        'Measure L-N, L-E, and N-E at load terminals confirming 0V.',
        'Re-verify tester on proving unit.',
      ],
      safetyGuidelines: [
        'Wear Class 00 insulated gloves and arc-rated safety glasses.',
        'Keep fingers behind probe guards at all times.',
      ],
      requiredTools: ['Two-Pole Voltage Tester', 'Proving Unit', 'LOTO Padlock & Tag', 'Safety Glasses'],
      rubric: [
        { criterion: 'Pre-Test Proving Unit Check', weight: 25 },
        { criterion: 'Lockout Padlock & Tag Placement', weight: 25 },
        { criterion: 'All-Pole Zero Voltage Check', weight: 25 },
        { criterion: 'Post-Test Proving Unit Check', weight: 25 },
      ],
      durationMinutes: 15,
    },
    {
      id: 'tsk_el_insulation',
      tradeId: 'trd_electrician',
      moduleId: 'mod_el_3',
      competencyId: 'cmp_el_108',
      title: '500V DC Insulation Resistance & Continuity Audit',
      description: 'Isolate loads, null test leads, measure R1+R2 continuity, and execute 500V DC insulation resistance test across final sub-circuits.',
      instructions: [
        'Disconnect sensitive electronic devices from circuit.',
        'Null test leads and record R1+R2.',
        'Perform 500V DC insulation resistance checks L-E, N-E, L-N.',
      ],
      safetyGuidelines: [
        'Confirm circuit is dead before applying 500V DC test voltage.',
        'Allow capacitive charge to bleed down automatically before disconnecting probes.',
      ],
      requiredTools: ['Multifunction Tester', 'Nulling Lead', 'Test Record Sheet'],
      rubric: [
        { criterion: 'Lead Nulling & Zeroing', weight: 25 },
        { criterion: 'Sensitive Load Isolation', weight: 30 },
        { criterion: 'Accurate 500V Measurement & Logging', weight: 45 },
      ],
      durationMinutes: 20,
    },
  ];

  const practicalSubmissions: PracticalSubmission[] = [
    {
      id: 'sub_el_isolation_liam',
      userId: 'usr_apprentice_liam',
      studentName: 'Liam Vance',
      tradeId: 'trd_electrician',
      taskId: 'tsk_el_isolation',
      taskTitle: 'Feeder Lockout/Tagout & Proving Unit Sequence',
      competencyId: 'cmp_el_101',
      competencyCode: 'EL-101',
      mediaLabel: 'Feeder-B Safe Isolation Demonstration (Demo Sample)',
      mediaType: 'demo_capture',
      fileHash: 'sha256:9f84b2c1d84e7710a2f43188c012e9ab',
      durationSeconds: 94,
      isDemoSample: true,
      aiAnalysis: {
        mode: 'gemini-live',
        model: 'gemini-4-hydrogen',
        analyzedAt: daysAgo(10),
        overallPreliminaryScore: 93,
        summary: 'Demonstrates complete Test-Prove-Test sequence with personal lockout padlock applied cleanly to Feeder-B.',
        detectedTools: ['Two-Pole Voltage Indicator', 'Proving Unit', 'LOTO Padlock & Tag', 'Safety Glasses'],
        observedActions: [
          'Tested two-pole indicator on proving unit prior to contact',
          'Applied personal padlock and warning tag to isolated breaker',
          'Measured L-N, L-E, N-E confirming 0V',
          'Re-proved indicator on proving unit after isolation check',
        ],
        safetyObservations: ['PPE glasses worn continuously', 'Fingers remained behind CAT IV probe guards'],
        missingEvidence: [],
        rubricResults: [
          { criterion: 'Pre-Test Proving Unit Check', status: 'observed', notes: 'Observed at 00:08' },
          { criterion: 'Lockout Padlock & Tag Placement', status: 'observed', notes: 'Observed at 00:29' },
          { criterion: 'All-Pole Zero Voltage Check', status: 'observed', notes: 'Observed at 00:52' },
          { criterion: 'Post-Test Proving Unit Check', status: 'observed', notes: 'Observed at 01:21' },
        ],
        timelineMarkers: [
          { timestampSeconds: 8, label: 'Pre-Test Proving Unit', category: 'action', observation: 'Voltage tester verified at 230V/400V LEDs on proving unit.', confidence: 'high' },
          { timestampSeconds: 29, label: 'LOTO Padlock Applied', category: 'safety', observation: 'Breaker switched OFF, personal padlock and tag secured.', confidence: 'high' },
          { timestampSeconds: 52, label: 'Zero-Energy Probe Check', category: 'tool', observation: 'Two-pole probes placed across L-N, L-E, N-E terminals.', confidence: 'high' },
          { timestampSeconds: 81, label: 'Post-Test Re-Prove', category: 'action', observation: 'Tester re-verified on proving unit after isolation test.', confidence: 'high' },
        ],
        disclaimer: 'Preliminary AI Skill Vision observation. Official verification requires Mentor or Assessor approval.',
      },
      oralExam: {
        status: 'completed',
        overallScore: 92,
        summary: 'Demonstrated strong conceptual clarity on false-zero failure modes and statutory lockout rules.',
        turns: [
          {
            id: 'turn_1',
            turnNumber: 1,
            difficulty: 'foundational',
            competencyCode: 'EL-101',
            question: 'Why must you test your voltage indicator on a proving unit both before and after testing the circuit?',
            studentAnswer: 'To prove the meter works before trusting a 0V reading, and afterwards to ensure the meter did not fail during the check.',
            transcriptSource: 'voice',
            score: 94,
            feedback: 'Exact technical reasoning covering pre- and post-test failure prevention.',
          },
          {
            id: 'turn_2',
            turnNumber: 2,
            difficulty: 'diagnostic',
            competencyCode: 'EL-101',
            question: 'If the proving unit battery dies mid-inspection, what should your immediate action be?',
            studentAnswer: 'Treat the circuit as live, stop work, and obtain a verified working proving unit and tester before touching any conductors.',
            transcriptSource: 'voice',
            score: 90,
            feedback: 'Correct fail-safe escalation.',
          },
        ],
      },
      integrityCheck: {
        fileHash: 'sha256:9f84b2c1d84e7710a2f43188c012e9ab',
        duplicateFound: false,
        metadataStatus: 'verified',
        challengeCode: 'IQ-CHK-419',
        riskLevel: 'low',
        notes: 'Unique file digest, continuous 94s timestamp stream, verbal challenge code verified.',
      },
      status: 'approved',
      reviewerId: 'usr_mentor_elena',
      reviewerName: 'Elena Rostova',
      reviewerRole: 'mentor',
      reviewerNotes: 'Clean Test-Prove-Test discipline and crisp oral defense. Approved EL-101.',
      reviewedAt: daysAgo(9),
      createdAt: daysAgo(10),
    },
    {
      id: 'sub_el_continuity_liam',
      userId: 'usr_apprentice_liam',
      studentName: 'Liam Vance',
      tradeId: 'trd_electrician',
      taskId: 'tsk_el_insulation',
      taskTitle: 'Protective Earthing & Continuity Verification (R1+R2)',
      competencyId: 'cmp_el_102',
      competencyCode: 'EL-102',
      mediaLabel: 'Continuity & Earthing Workbench Check (Demo Sample)',
      mediaType: 'demo_capture',
      fileHash: 'sha256:3c71e80b4f2d11a98c44e2b0134f9910',
      durationSeconds: 108,
      isDemoSample: true,
      aiAnalysis: {
        mode: 'gemini-live',
        model: 'gemini-4-hydrogen',
        analyzedAt: daysAgo(7),
        overallPreliminaryScore: 88,
        summary: 'Multifunction tester leads nulled accurately; CPC continuity verified across socket ring terminals.',
        detectedTools: ['Digital Multifunction Tester', 'Calibrated Test Leads', 'Insulated Screwdriver'],
        observedActions: [
          'Connected L and CPC at distribution board earth bar',
          'Nulled test lead resistance (0.12 Ohm offset removed)',
          'Measured R1+R2 at furthest radial outlet (0.48 Ohm)',
        ],
        safetyObservations: ['Circuit confirmed isolated before continuity link applied'],
        missingEvidence: ['Torque check on earth bar screw partially obscured at 01:18 — Requires Assessor Review'],
        rubricResults: [
          { criterion: 'Lead Nulling & Zeroing', status: 'observed', notes: 'Observed at 00:14' },
          { criterion: 'CPC Continuity Verification', status: 'observed', notes: 'Observed at 00:46' },
          { criterion: 'Earth Bar Re-Termination Torque', status: 'insufficient_evidence', notes: 'Hand obscured view at 01:18; requires mentor review' },
        ],
        timelineMarkers: [
          { timestampSeconds: 14, label: 'Lead Nulling', category: 'tool', observation: 'Test leads clipped together and nulled on digital tester.', confidence: 'high' },
          { timestampSeconds: 46, label: 'Outlet Continuity Reading', category: 'action', observation: 'Meter reads 0.48 Ohm R1+R2 at radial socket.', confidence: 'high' },
          { timestampSeconds: 78, label: 'Earth Bar Re-Termination', category: 'insufficient', observation: 'Insufficient Evidence: camera angle blocks view of final earth bar torque check.', confidence: 'insufficient_evidence' },
        ],
        disclaimer: 'Preliminary AI Skill Vision observation. Unclear segments flagged as Insufficient Evidence for human review.',
      },
      oralExam: {
        status: 'completed',
        overallScore: 90,
        summary: 'Explained R1+R2 relationship with Zs and why parallel earth paths must be disconnected during ring testing.',
        turns: [
          {
            id: 'turn_c1',
            turnNumber: 1,
            difficulty: 'applied',
            competencyCode: 'EL-102',
            question: 'How does your measured R1+R2 reading help predict whether an MCB will trip fast enough under an earth fault?',
            studentAnswer: 'Total fault loop impedance Zs equals Ze plus R1+R2, so higher continuity resistance lowers fault current and can delay breaker disconnection.',
            transcriptSource: 'text',
            score: 90,
            feedback: 'Correct mathematical and safety link between R1+R2 and Zs.',
          },
        ],
      },
      integrityCheck: {
        fileHash: 'sha256:3c71e80b4f2d11a98c44e2b0134f9910',
        duplicateFound: false,
        metadataStatus: 'verified',
        challengeCode: 'IQ-CHK-512',
        riskLevel: 'low',
        notes: 'Valid metadata and unique recording hash.',
      },
      status: 'approved',
      reviewerId: 'usr_assessor_marcus',
      reviewerName: 'Marcus Thorne',
      reviewerRole: 'assessor',
      reviewerNotes: 'Verified live during workshop inspection of earth bar termination. EL-102 approved.',
      reviewedAt: daysAgo(6),
      createdAt: daysAgo(7),
    },
    {
      id: 'sub_el_db_liam_pending',
      userId: 'usr_apprentice_liam',
      studentName: 'Liam Vance',
      tradeId: 'trd_electrician',
      taskId: 'tsk_el_db_assembly',
      taskTitle: 'Single-Phase Distribution Board Assembly & Isolation Check',
      competencyId: 'cmp_el_103',
      competencyCode: 'EL-103',
      mediaLabel: 'Single-Phase Distribution Board Wiring (Demo Capture)',
      mediaType: 'demo_capture',
      fileHash: 'sha256:7d12aa90e3b24c881a5f0099d12c44f1',
      durationSeconds: 118,
      isDemoSample: true,
      aiAnalysis: {
        mode: 'gemini-live',
        model: 'gemini-4-hydrogen',
        analyzedAt: daysAgo(1),
        overallPreliminaryScore: 87,
        summary: 'Clean DIN-rail layout with 40A main switch, 30mA RCCB, and MCB bank. Insulated Wiha screwdriver and Fluke multimeter visible; torque check step needs assessor confirmation.',
        detectedTools: ['Fluke Digital Multimeter (238.2V)', 'Wiha VDE Insulated Screwdriver', 'Insulated Wire Cutters', 'Green/Yellow Earth Cable'],
        observedActions: [
          'Mounted 40A main isolator, RCCB, and 8-way MCB bank cleanly on DIN rail',
          'Routed red phase, blue neutral, and green/yellow earth conductors with bootlace ferrules',
          'Verified busbar voltage clearance with digital tester',
        ],
        safetyObservations: [
          'VDE 1000V insulated screwdriver used on terminals',
          'No stray uninsulated copper strands observed at MCB cage clamps',
        ],
        missingEvidence: ['Torque calibration click on main 40A isolator terminals not clearly audible/visible — Requires Assessor Review'],
        rubricResults: [
          { criterion: 'PPE & Insulated Tool Usage', status: 'observed', notes: 'VDE insulated tools observed on workbench' },
          { criterion: 'DIN-Rail Switchgear & Busbar Routing', status: 'observed', notes: 'Clean vertical & horizontal busbar bends at 00:34' },
          { criterion: 'Conductor Stripping & Ferrule Termination Quality', status: 'observed', notes: 'Red/blue ferrules clearly visible at 00:58' },
          { criterion: 'Zero-Voltage Verification Before Handling', status: 'partial', notes: 'Meter read 238.2V on supply side check at 01:36; final torque check requires assessor sign-off' },
        ],
        timelineMarkers: [
          { timestampSeconds: 12, label: 'Tool & PPE Inspection', category: 'tool', observation: 'Wiha VDE 1000V screwdriver and Fluke tester staged on mat.', confidence: 'high' },
          { timestampSeconds: 34, label: 'DIN-Rail Busbar Routing', category: 'action', observation: 'Phase and neutral conductors dressed neatly into copper busbars.', confidence: 'high' },
          { timestampSeconds: 58, label: 'Ferrule Terminations', category: 'action', observation: 'Crimped ferrules seated inside MCB and RCCB terminals.', confidence: 'high' },
          { timestampSeconds: 96, label: 'Multimeter Verification', category: 'safety', observation: 'Digital tester displays 238.2V during supply test sequence.', confidence: 'high' },
          { timestampSeconds: 110, label: 'Terminal Torque Check', category: 'insufficient', observation: 'Insufficient Evidence: torque setting indicator obscured from camera.', confidence: 'insufficient_evidence' },
        ],
        disclaimer: 'Preliminary AI Skill Vision analysis. Insufficient evidence markers require human mentor/assessor inspection.',
      },
      oralExam: {
        status: 'completed',
        overallScore: 91,
        summary: 'Strong understanding of MCB overcurrent curve selection and RCCB 30mA residual current tripping threshold.',
        turns: [
          {
            id: 'turn_db_1',
            turnNumber: 1,
            difficulty: 'foundational',
            competencyCode: 'EL-103',
            question: 'Explain why bootlace ferrules are fitted onto multi-stranded copper conductors before clamping them into MCB terminals.',
            studentAnswer: 'Ferrules bind all the fine strands together so the terminal screw cannot shear or splay strands out, preventing loose high-resistance joints.',
            transcriptSource: 'voice',
            score: 93,
            feedback: 'Clear explanation addressing strand integrity and contact resistance.',
          },
          {
            id: 'turn_db_2',
            turnNumber: 2,
            difficulty: 'applied',
            competencyCode: 'EL-104',
            question: 'If a circuit supplies a small commercial motor with high inrush current, would you specify a Type B or Type C MCB, and why?',
            studentAnswer: 'Type C, because its magnetic trip threshold is 5 to 10 times rated current, allowing motor startup inrush without nuisance tripping while still protecting the cable.',
            transcriptSource: 'voice',
            score: 89,
            feedback: 'Correct magnetic curve multiplier and reasoning; remember to confirm Zs is low enough for Type C disconnection.',
          },
        ],
      },
      integrityCheck: {
        fileHash: 'sha256:7d12aa90e3b24c881a5f0099d12c44f1',
        duplicateFound: false,
        metadataStatus: 'verified',
        challengeCode: 'IQ-CHK-704',
        riskLevel: 'low',
        notes: 'Unique video digest, continuous workbench lighting, challenge code IQ-CHK-704 matched.',
      },
      status: 'pending_review',
      createdAt: daysAgo(1),
    },
    {
      id: 'sub_el_maya_integrity',
      userId: 'usr_apprentice_maya',
      studentName: 'Maya Lin',
      tradeId: 'trd_electrician',
      taskId: 'tsk_el_isolation',
      taskTitle: 'Feeder Lockout/Tagout & Proving Unit Sequence',
      competencyId: 'cmp_el_101',
      competencyCode: 'EL-101',
      mediaLabel: 'Isolation Practice Upload (Requires Human Review)',
      mediaType: 'uploaded_video',
      fileHash: 'sha256:9f84b2c1d84e7710a2f43188c012e9ab',
      durationSeconds: 42,
      isDemoSample: true,
      aiAnalysis: {
        mode: 'gemini-live',
        model: 'gemini-4-hydrogen',
        analyzedAt: daysAgo(2),
        overallPreliminaryScore: 52,
        summary: 'Post-test proving unit verification was not captured before recording ended; requires mentor follow-up.',
        detectedTools: ['Two-Pole Voltage Indicator'],
        observedActions: ['Breaker switched to OFF position'],
        safetyObservations: ['Gloves not visible in frame — Requires Assessor Review'],
        missingEvidence: ['Pre-test proving unit check not observed', 'Post-test proving unit check not observed'],
        rubricResults: [
          { criterion: 'Pre-Test Proving Unit Check', status: 'insufficient_evidence', notes: 'Video starts after isolation' },
          { criterion: 'Lockout Padlock & Tag Placement', status: 'partial', notes: 'Padlock placed, tag unreadable' },
          { criterion: 'All-Pole Zero Voltage Check', status: 'observed', notes: 'L-N checked at 00:26' },
          { criterion: 'Post-Test Proving Unit Check', status: 'insufficient_evidence', notes: 'Clip ended before re-prove' },
        ],
        timelineMarkers: [
          { timestampSeconds: 10, label: 'Breaker Switched Off', category: 'action', observation: 'Isolator moved to OFF.', confidence: 'high' },
          { timestampSeconds: 26, label: 'Partial Probe Check', category: 'insufficient', observation: 'Insufficient Evidence: only L-N probed; L-E and N-E not visible.', confidence: 'insufficient_evidence' },
        ],
        disclaimer: 'Preliminary AI observation only. Integrity flags never auto-penalize students; human review required.',
      },
      oralExam: {
        status: 'not_started',
        turns: [],
        overallScore: null,
      },
      integrityCheck: {
        fileHash: 'sha256:9f84b2c1d84e7710a2f43188c012e9ab',
        duplicateFound: true,
        metadataStatus: 'review_recommended',
        challengeCode: 'MISSING',
        riskLevel: 'high',
        notes: 'File SHA-256 digest matches an earlier archive submission and verbal challenge code was omitted. Mentor conversation recommended.',
      },
      status: 'pending_review',
      createdAt: daysAgo(2),
    },
  ];

  const studentCompetencies: StudentCompetency[] = [
    // Liam Vance progress across 10 Electrician competencies
    {
      userId: 'usr_apprentice_liam',
      competencyId: 'cmp_el_101',
      state: 'verified',
      learnedAt: daysAgo(14),
      practisedAt: daysAgo(12),
      demonstratedAt: daysAgo(10),
      verifiedAt: daysAgo(9),
      verifiedBy: 'usr_mentor_elena',
      verifiedByName: 'Elena Rostova',
      mentorNotes: 'Clean Test-Prove-Test protocol.',
      evidenceSubmissionId: 'sub_el_isolation_liam',
    },
    {
      userId: 'usr_apprentice_liam',
      competencyId: 'cmp_el_102',
      state: 'verified',
      learnedAt: daysAgo(11),
      practisedAt: daysAgo(9),
      demonstratedAt: daysAgo(7),
      verifiedAt: daysAgo(6),
      verifiedBy: 'usr_assessor_marcus',
      verifiedByName: 'Marcus Thorne',
      mentorNotes: 'Accurate R1+R2 measurements.',
      evidenceSubmissionId: 'sub_el_continuity_liam',
    },
    {
      userId: 'usr_apprentice_liam',
      competencyId: 'cmp_el_103',
      state: 'demonstrated',
      learnedAt: daysAgo(6),
      practisedAt: daysAgo(3),
      demonstratedAt: daysAgo(1),
      evidenceSubmissionId: 'sub_el_db_liam_pending',
    },
    {
      userId: 'usr_apprentice_liam',
      competencyId: 'cmp_el_104',
      state: 'practised',
      learnedAt: daysAgo(5),
      practisedAt: daysAgo(2),
    },
    {
      userId: 'usr_apprentice_liam',
      competencyId: 'cmp_el_105',
      state: 'learned',
      learnedAt: daysAgo(3),
    },
    {
      userId: 'usr_apprentice_liam',
      competencyId: 'cmp_el_108',
      state: 'learned',
      learnedAt: daysAgo(2),
    },
    // Maya Lin (struggling learner)
    {
      userId: 'usr_apprentice_maya',
      competencyId: 'cmp_el_101',
      state: 'demonstrated',
      learnedAt: daysAgo(18),
      practisedAt: daysAgo(12),
      demonstratedAt: daysAgo(2),
      evidenceSubmissionId: 'sub_el_maya_integrity',
    },
    {
      userId: 'usr_apprentice_maya',
      competencyId: 'cmp_el_102',
      state: 'learned',
      learnedAt: daysAgo(15),
    },
  ];

  const skillPassports: SkillPassport[] = [
    {
      passportId: 'IQ-EL-2026-8841',
      userId: 'usr_apprentice_liam',
      apprenticeName: 'Liam Vance',
      institution: 'Apex Technical Institute',
      tradeId: 'trd_electrician',
      tradeName: 'Industrial & Commercial Electrician',
      avatarUrl: '/src/assets/images/apprentice_portrait_1795499741960.jpg',
      issueDate: daysAgo(6),
      expiresAt: new Date(Date.now() + 365 * 86400_000).toISOString(),
      status: 'active',
      approvedBy: 'Elena Rostova & Marcus Thorne (Apex Technical Institute)',
      verificationCount: 14,
    },
    {
      passportId: 'IQ-EL-2026-9012',
      userId: 'usr_apprentice_maya',
      apprenticeName: 'Maya Lin',
      institution: 'Apex Technical Institute',
      tradeId: 'trd_electrician',
      tradeName: 'Industrial & Commercial Electrician',
      avatarUrl: '/src/assets/images/hero_electrical_lab_1795499740829.jpg',
      issueDate: daysAgo(2),
      expiresAt: new Date(Date.now() + 365 * 86400_000).toISOString(),
      status: 'pending',
      approvedBy: 'Pending Mentor Verification',
      verificationCount: 0,
    },
  ];

  const learningRiskRecords: LearningRiskRecord[] = [
    {
      userId: 'usr_apprentice_liam',
      studentName: 'Liam Vance',
      tradeId: 'trd_electrician',
      riskLevel: 'low',
      riskScore: 14,
      factors: ['Consistent 6-day learning cadence', '91.5% average checkpoint evaluation'],
      recommendations: ['Await mentor review on EL-103 DB Assembly', 'Start EL-108 500V DC Insulation Resistance lab'],
      updatedAt: now,
    },
    {
      userId: 'usr_apprentice_maya',
      studentName: 'Maya Lin',
      tradeId: 'trd_electrician',
      riskLevel: 'high',
      riskScore: 78,
      factors: [
        '2 video playback policy resets triggered in Safe Isolation lesson',
        '3-day inactivity gap prior to latest submission',
        'Missing proving unit re-check in practical submission',
      ],
      recommendations: [
        'Schedule 1-on-1 bench session with Mentor Elena Rostova on LOTO sequence',
        'Complete remedial guided walkthrough for EL-101',
        'Submit fresh recorded isolation clip with challenge code',
      ],
      updatedAt: now,
    },
  ];

  const industryProjects: IndustryProject[] = [
    {
      id: 'prj_solar_subboard',
      tradeId: 'trd_electrician',
      title: 'Commercial EV & Solar Micro-Grid Sub-Distribution Panel',
      industryPartner: 'GridCore Energy Systems',
      problemStatement: 'Design and wire a dual-feed sub-distribution panel separating critical backup loads from EV charger demand using Type A/B RCD selectivity.',
      toolsAndMaterials: ['8-Way IP65 Enclosure', '40A Main Switch', '30mA Type A RCCB', '6mm² Tri-Rated Cable', 'Torque Driver', 'Multifunction Tester'],
      requiredCompetencyCodes: ['EL-101', 'EL-102', 'EL-103'],
      difficulty: 'Intermediate',
      expectedOutcome: 'Complete sub-board wiring diagram, dead continuity/insulation test sheet, and photo/video inspection.',
      rubric: ['Correct selectivity between upstream & downstream RCDs', 'Clean ferrule & busbar dressing', 'Complete test sheet logged'],
    },
    {
      id: 'prj_motor_panel',
      tradeId: 'trd_electrician',
      title: 'Automated Conveyor Star-Delta Starter Retrofit',
      industryPartner: 'Vanguard Logistics Automation',
      problemStatement: 'Replace a failing direct-on-line starter on a 7.5kW warehouse conveyor with an interlocked Star-Delta panel and emergency stop safety relay.',
      toolsAndMaterials: ['3x AC3 Contactors', 'Star-Delta Timer', 'Thermal Overload Relay', 'DIN Terminal Blocks', 'Clamp Meter'],
      requiredCompetencyCodes: ['EL-103', 'EL-104', 'EL-107'],
      difficulty: 'Capstone',
      expectedOutcome: 'Bench-tested control circuit with verified mechanical & electrical interlock and motor FLA calibration.',
      rubric: ['Zero short-circuit risk during Star-to-Delta transition', 'Emergency stop safety category compliance', 'Clean schematic tagging'],
    },
  ];

  const projectSubmissions: ProjectSubmission[] = [
    {
      id: 'prjsub_1',
      projectId: 'prj_solar_subboard',
      userId: 'usr_apprentice_liam',
      notes: 'Completed dead continuity check across all sub-board earth bars (0.14 Ohm) and terminated 6mm² supply tails with crimped ferrules.',
      evidenceLabel: 'Sub-Distribution Panel Bench Photos & Test Log (Demo)',
      aiFeedback: 'Preliminary check: conductor sizing and ferrule termination align with EL-103 standards. Ready for mentor approval.',
      status: 'approved',
      mentorNotes: 'Excellent workmanship—added to Digital Skill Passport portfolio.',
      createdAt: daysAgo(4),
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'aud_1',
      actorId: 'usr_mentor_elena',
      actorName: 'Elena Rostova',
      actorRole: 'mentor',
      action: 'COMPETENCY_VERIFIED',
      targetType: 'student_competency',
      targetId: 'cmp_el_101',
      details: 'Verified EL-101 Lockout/Tagout for Liam Vance after reviewing practical video and oral transcript.',
      createdAt: daysAgo(9),
    },
    {
      id: 'aud_2',
      actorId: 'usr_assessor_marcus',
      actorName: 'Marcus Thorne',
      actorRole: 'assessor',
      action: 'COMPETENCY_VERIFIED',
      targetType: 'student_competency',
      targetId: 'cmp_el_102',
      details: 'Verified EL-102 Protective Earthing & Continuity for Liam Vance.',
      createdAt: daysAgo(6),
    },
    {
      id: 'aud_3',
      actorId: 'usr_apprentice_liam',
      actorName: 'Liam Vance',
      actorRole: 'apprentice',
      action: 'PRACTICAL_SUBMITTED',
      targetType: 'practical_submission',
      targetId: 'sub_el_db_liam_pending',
      details: 'Submitted practical demonstration and completed adaptive oral exam for EL-103.',
      createdAt: daysAgo(1),
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: 'ntf_1',
      userId: 'usr_apprentice_liam',
      title: 'EL-103 Oral Examination Complete',
      message: 'Your Single-Phase Distribution Board submission scored 91% preliminary oral reasoning and is queued for Mentor Elena Rostova.',
      category: 'assessment',
      read: false,
      createdAt: daysAgo(1),
    },
    {
      id: 'ntf_2',
      userId: 'usr_mentor_elena',
      title: '2 Submissions Awaiting Verification',
      message: 'Liam Vance (EL-103 DB Assembly) and Maya Lin (EL-101 Integrity Flagged) require review.',
      category: 'verification',
      read: false,
      createdAt: daysAgo(1),
    },
    {
      id: 'ntf_3',
      userId: 'usr_assessor_marcus',
      title: 'Assessor Queue Updated',
      message: 'EL-103 torque verification flagged as Insufficient Evidence by AI Skill Vision — physical or live inspection requested.',
      category: 'integrity',
      read: false,
      createdAt: daysAgo(1),
    },
  ];

  return {
    users,
    trades,
    modules,
    lessons,
    lessonProgress,
    playbackEvents: [],
    competencies,
    studentCompetencies,
    practicalTasks,
    practicalSubmissions,
    skillPassports,
    learningRiskRecords,
    industryProjects,
    projectSubmissions,
    employerRequests: [],
    platformSettings: {
      institutionName: 'Apex Technical Institute',
      maxForwardSkips: 2,
      forwardSkipSeconds: 10,
      requireCheckpointPass: true,
    },
    auditLogs,
    notifications,
  };
}

class DatabaseStore {
  private state: DatabaseState;

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.state = JSON.parse(raw) as DatabaseState;
      } catch {
        this.state = createSeedState();
        this.save();
      }
    } else {
      this.state = createSeedState();
      this.save();
    }
  }

  get data(): DatabaseState {
    return this.state;
  }

  save(): void {
    const tmp = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.state, null, 2), 'utf8');
    fs.renameSync(tmp, DB_FILE);
  }

  toPublicUser(user: StoredUser): PublicUser {
    const { passwordHash: _h, passwordSalt: _s, ...pub } = user;
    return pub;
  }

  logAudit(actor: PublicUser, action: string, targetType: string, targetId: string, details: string): void {
    this.state.auditLogs.unshift({
      id: `aud_${crypto.randomUUID().slice(0, 8)}`,
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role as UserRole,
      action,
      targetType,
      targetId,
      details,
      createdAt: new Date().toISOString(),
    });
    if (this.state.auditLogs.length > 250) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 250);
    }
    this.save();
  }

  pushNotification(userId: string, title: string, message: string, category: AppNotification['category']): void {
    this.state.notifications.unshift({
      id: `ntf_${crypto.randomUUID().slice(0, 8)}`,
      userId,
      title,
      message,
      category,
      read: false,
      createdAt: new Date().toISOString(),
    });
    this.save();
  }
}

export const db = new DatabaseStore();
