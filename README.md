APPRENTICE IQ

Proof of Skill. Not Just Proof of Training.

An AI-powered vocational learning and skill verification platform that transforms training into evidence-backed competencies.

<p align="center">
  <strong>LEARN → UNDERSTAND → PRACTISE → DEMONSTRATE → VERIFY → PROVE</strong>
</p>

About the Project

Traditional vocational training systems often measure attendance, course completion and theoretical knowledge. However, completing a course does not necessarily prove that an apprentice can independently perform a practical task.

Employers need more than certificates. They need credible evidence of what a candidate can actually do.

APPRENTICE IQ addresses this gap through an AI-powered vocational learning and skill verification platform that connects structured learning, intelligent assessments, practical demonstrations, human verification and employer-facing skill records.

The platform transforms vocational training from a completion-based process into an evidence-driven competency journey.

Our vision is simple:

Make practical skills visible, measurable, verifiable and employable.

The Problem We Solve

Vocational education faces a fundamental challenge: the gap between learning a skill and proving a skill.

Training completion does not guarantee practical competence.

Traditional examinations may not adequately evaluate hands-on abilities.

Employers often lack transparent evidence of candidates' actual capabilities.

Learners may struggle to identify their competency gaps.

Practical assessment and verification can be difficult to standardise and track.

APPRENTICE IQ bridges this gap by connecting learning, practical evidence, intelligent assessment and authorised human verification in one platform.

Our Solution

APPRENTICE IQ introduces an evidence-based vocational competency framework with four progressive stages:

Stage

Description

Learned

The apprentice has studied the concept.

Practised

The apprentice has attempted the practical task.

Demonstrated

The apprentice has submitted practical evidence.

Verified

An authorised mentor or assessor has approved the competency.

Unlike conventional learning platforms, APPRENTICE IQ distinguishes between completing training and demonstrating actual competence.

Key Features

1. Trade-Specific Learning Pathways

Structured learning journeys with trade-specific modules, lessons and competency requirements.

2. Intelligent Learning Assessments

Embedded knowledge checkpoints evaluate an apprentice's understanding throughout the learning process.

3. AI Learning Copilot

A contextual AI assistant powered by Google Gemini that helps apprentices understand technical concepts, clarify doubts and overcome learning difficulties.

4. Custom Learning Video Player

A controlled learning experience with playback tracking, forward-skip policies, lesson progress and embedded knowledge checkpoints.

5. AI-Assisted Practical Skill Vision

Apprentices can submit practical evidence for AI-assisted analysis, including observed actions, detected tools, safety observations, evidence gaps and preliminary assessment feedback.

6. Adaptive AI Oral Examination

An interactive oral assessment that generates contextual follow-up questions based on practical evidence and competency requirements.

7. Skill Gap Intelligence Map

A visual competency tracker that shows an apprentice's progress through Learned, Practised, Demonstrated and Verified stages.

8. Mentor and Assessor Command Centre

A dedicated review workflow that allows authorised mentors and assessors to examine practical submissions, evaluate evidence and approve competencies.

9. Digital Skill Passport

A digital record of approved competencies and project achievements, supported by QR-based verification.

10. Employer Portal

An employer-facing interface for exploring apprentice profiles and their approved skill records.

11. Admin Portal

A centralised interface for platform administration, users and institutional settings.

12. Industry Project Recommendations

Industry-oriented projects that connect vocational competencies with practical workplace challenges.

How APPRENTICE IQ Works

          APPRENTICE
               |
               v
        SELECT A TRADE
               |
               v
       STRUCTURED LEARNING
               |
               v
      KNOWLEDGE CHECKPOINTS
               |
               v
       PRACTICAL PRACTICE
               |
               v
       SUBMIT EVIDENCE
               |
               v
       AI-ASSISTED ANALYSIS
               |
               v
      ADAPTIVE ORAL EXAM
               |
               v
       MENTOR / ASSESSOR
            REVIEW
               |
               v
       COMPETENCY APPROVAL
               |
               v
       DIGITAL SKILL PASSPORT
               |
               v
       EMPLOYER VERIFICATION

System Architecture

APPRENTICE IQ follows a full-stack architecture connecting the React frontend, Express backend, AI services and persistent application data.

             USER INTERFACES
                    |
       +------------+------------+
       |            |            |
   Apprentice     Mentor      Employer
     Portal       Portal       Portal
       |            |            |
       +------------+------------+
                    |
             REACT FRONTEND
          React 19 + TypeScript
                    |
               EXPRESS API
                    |
       +------------+------------+
       |            |            |
    Gemini AI    MediaPipe    Authentication
    Services     Vision       & Authorisation
       |            |            |
       +------------+------------+
                    |
             DATABASE STORE
             JSON Persistence
                    |
       +------------+------------+
       |            |            |
   Competencies  Submissions  Skill Passports

AI and Assessment Workflow

Google Gemini supports contextual learning assistance, knowledge assessment, practical evidence analysis and adaptive oral examinations.

MediaPipe Tasks Vision provides camera-presence and inactivity monitoring.

AI-generated observations are preliminary and support the assessment process.

Final competency approval remains with an authorised mentor or assessor.

Technology Stack

Layer

Technologies

Frontend

React 19

Programming Language

TypeScript

Build Tool

Vite

Styling

Tailwind CSS 4

Backend

Node.js, Express.js

AI Integration

Google Gemini API, @google/genai

Computer Vision

MediaPipe Tasks Vision

Data Persistence

JSON file-backed database

Authentication

JWT, scrypt password hashing

Charts

Recharts

Animations

Motion

QR Generation

qrcode

Icons

Lucide React

Project Structure

apprentice-iq/
│
├── public/
│   ├── assets/
│   └── mediapipe/
│
├── server/
│   ├── ai.ts
│   ├── auth.ts
│   └── db.ts
│
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── admin/
│   │   ├── apprentice/
│   │   ├── auth/
│   │   ├── camera/
│   │   ├── employer/
│   │   ├── layout/
│   │   ├── mentor/
│   │   └── public/
│   │
│   ├── context/
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── types.ts
│
├── data/                 # Local runtime database
├── server.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .env.example
└── README.md

Getting Started

Follow these instructions to run APPRENTICE IQ on your local machine.

Prerequisites

Node.js and npm

Google Gemini API key

Git

Step 1: Clone the Repository

git clone https://github.com/mahithaamyleshkumar/apprentice-iq.git

Step 2: Navigate to the Project Directory

cd apprentice-iq

Step 3: Install Dependencies

npm install

Step 4: Configure Environment Variables

Create a .env file in the root directory.

Add your Gemini API key:

GEMINI_API_KEY=your_gemini_api_key_here

Obtain an API key through Google AI Studio.

Important: Never commit your actual .env file or expose API keys in public repositories.

Refer to .env.example for the environment variable configuration expected by the project.

Step 5: Start the Application

npm run dev

This executes the tsx server.ts development script, which starts the Express application and its integrated frontend development setup.

Open the local address displayed in your terminal.

Step 6: Build the Application

npm run build

Step 7: Preview the Production Build

npm run preview

Step 8: Run TypeScript Checks

npm run lint

Demo Database and Sample Data

APPRENTICE IQ includes an automatic database initialisation mechanism.

When the backend starts for the first time and no local database exists:

The application creates the data/ directory.

It initialises the database using predefined seed records.

Sample users, trades, lessons, competencies and practical assessment records are generated.

The database is saved locally as apprentice_iq_db.json.

Subsequent application runs load the existing local database.

Supported User Roles

Role

Purpose

Apprentice

Learning, practising and demonstrating skills

Mentor

Reviewing evidence and guiding apprentices

Assessor

Evaluating and verifying competencies

Employer

Exploring approved skill records

Admin

Managing platform operations

The runtime database is excluded from Git version control. Each fresh installation creates its own local database using the application's seed data.

API Overview

The Express backend provides endpoints for the platform's core workflows.

Endpoint

Purpose

GET /api/health

Backend health check

GET /api/public/overview

Public platform overview

GET /api/verify/:passportId

Digital Skill Passport verification

POST /api/auth/login

User authentication

POST /api/auth/demo-login

Demo authentication

POST /api/auth/register

User registration

GET /api/auth/me

Current authenticated user

GET /api/curriculum

Trade curriculum

GET /api/apprentice/state

Apprentice learning state

POST /api/apprentice/select-trade

Trade selection

POST /api/playback/event

Video playback tracking

POST /api/lessons/:lessonId/checkpoint

Lesson assessment

POST /api/copilot/chat

AI Learning Copilot

POST /api/copilot/stream

Streaming AI assistance

POST /api/practical/analyze

Practical evidence analysis

POST /api/oral/:submissionId/turn

Adaptive oral assessment

GET /api/projects

Industry project discovery

POST /api/projects/:projectId/submit

Project submission

Innovation and Differentiation

APPRENTICE IQ focuses on a fundamental question:

Can the learner actually perform the skill, or have they only completed the training?

Our key differentiators include:

Four-stage competency progression instead of course-completion-only tracking.

AI-assisted analysis of practical evidence.

Adaptive oral assessments linked to practical demonstrations.

Human-authorised competency verification.

QR-verifiable Digital Skill Passports.

Employer-facing visibility into approved competencies.

Integration of learning, assessment and verification into one workflow.

Responsible AI and Verification

APPRENTICE IQ uses AI to support learning and assessment, not to replace qualified human judgement.

AI-generated practical observations are preliminary.

Unclear or insufficient evidence can be flagged for review.

Mentors and authorised assessors retain responsibility for final competency decisions.

Camera-presence monitoring is not identity verification.

Digital Skill Passport records represent platform-issued records, not statutory government qualifications or professional licences unless issued by a recognised authority.

Future Scope

Potential future enhancements include:

Multilingual vocational learning experiences.

Expanded trade-specific competency frameworks.

More advanced practical video understanding.

Industry and training-provider integrations.

Portable competency credentials.

Employer recruitment and talent-discovery workflows.

Expanded analytics for training institutions.
