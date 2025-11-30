# Backend Project Work Plan: Math Pilot V2

**Version:** 1.1
**Date:** November 26, 2025
**Timeline:** Nov 23, 2025 - Feb 1, 2026
**Team Composition:** 4 Backend Developers (Part-time, ~25h/week each)
**Work Schedule:** Sun-Thu (Fridays/Saturdays off)

---

## 1. Executive Summary

This plan outlines the roadmap for the backend development of the Math Pilot V2 platform. The primary goal is to deliver a robust, scalable backend that supports the core "Maths AI" workflow, real-time analytics, and the CQRS architecture by early February.

**Strategic Approach: "Write-Side First" & "API First"**
1.  **Write-Side First:** We will fully implement the Command side (Postgres) for all core business logic first. The Query side (Mongo) schemas will be finalized and implemented later, allowing flexibility in defining analytics requirements.
2.  **API First:** We prioritize **API Dog** contracts. We provide mocks/contracts to the Frontend team immediately, even if the backend logic isn't finished.

---

## 2. Timeline & Phasing (10 Weeks)

### Phase 1: Foundation & Registration (Week 1)
*Status: In Progress (Ending Nov 28)*
*Goal: Architecture set, Auth ready, Users can register.*

#### Week 1 (Nov 23 - Nov 28)
- **Accomplished:**
    - CQRS Boilerplate & Project Structure setup.
    - Authentication integration with **Clerk**.
    - Design & Requirement detailed discussions.
- **Remaining Tasks (To be done by Nov 28):**
    - **Dev 3:** Implement Registration API for **Institutions** & **Teachers** (saving to Postgres).
    - **Dev 4:** Implement Registration API for **Parents** & **Students** (saving to Postgres).
    - **Dev 1:** Setup **API Dog** project and sync pipeline.

---

### Phase 2: Core Domain "Write-Side" (Weeks 2-4)
*Goal: All data creation flows are working. Teachers can create content, Students can submit.*

#### Week 2 (Nov 30 - Dec 4)
*Focus: Classrooms & Question Banks*
- **Dev 1:** Set up CI/CD pipeline and Docker environment.
- **Dev 2:** Implement `QuestionBank` Commands (Create Subject/Topic/Question) using existing ERD/Schema.
- **Dev 3:** Implement `Classroom` Commands (Create Class, Enroll Student).
- **Dev 4:** Create database seeding scripts (Mock Institutions/Classes) so FE has data to display.
- **All:** Ensure **API Dog** specs are updated daily.

#### Week 3 (Dec 7 - Dec 11)
*Focus: Assessment Creation*
- **Dev 1:** Setup WebSocket Gateway foundation (Authentication/Connection only).
- **Dev 2:** Implement `Exam` & `Homework` Commands (Create assessment, assign questions).
- **Dev 3:** Implement `Student` dashboard queries (Postgres-based temporary reads for "My Pending Work").
- **Dev 4:** Implement `Parent` logic (Link child).

#### Week 4 (Dec 14 - Dec 18)
*Focus: Submissions & Scoring logic*
- **Dev 1:** Implement AI Service stub (Mock input/output for grading).
- **Dev 2:** **Critical:** Implement `Submission` Commands. Handle answer reception, calculate raw scores.
- **Dev 3:** Implement "Join Class" flows and Independent Student specific logic.
- **Dev 4:** Integration tests for the full Write-side flow.

---

### Phase 3: The "Read-Side" & Analytics (Weeks 5-7)
*Goal: Defining the Mongo projections and enabling real-time analytics.*

#### Week 5 (Dec 21 - Dec 25) *[Holiday Buffer]*
- *Light load week. Focus on technical debt and documentation.*
- **Key Task:** Finalize the specific data shapes needed for the MongoDB Analytics collections based on the finalized UI designs.

#### Week 6 (Dec 28 - Jan 1)
*Focus: CQRS Projections*
- **Dev 1:** Build the Event Handlers that listen to Postgres events (e.g., `ExamSubmitted`).
- **Dev 2:** Implement the "Projectors" that transform these events into MongoDB updates (StudentProgress, ClassAnalytics).
- **Dev 3:** Create the Read-side APIs (Fetch Analytics for Dashboard) - moving away from Postgres reads.
- **Dev 4:** Implement Notification triggers (Email/In-app) based on events.

#### Week 7 (Jan 4 - Jan 8)
*Focus: Real-Time Data*
- **Dev 1:** Connect Event Handlers to WebSocket Gateway to emit live updates to clients.
- **Dev 2:** Optimize MongoDB Aggregation pipelines for complex analytic queries.
- **All:** "Bug Bash" - Test the loop: Submit Exam (Postgres) -> Event Triggered -> Mongo Updated -> WebSocket Emitted -> Dashboard Updates.

---

### Phase 4: Polish & AI Integration (Weeks 8-10)
*Goal: Production ready.*

#### Week 8 (Jan 11 - Jan 15)
- **Dev 1:** Connect real AI API (OpenAI/LLM) replacing the stubs.
- **Dev 2:** Refine "Practice Mode" logic.
- **Dev 3:** Implement sophisticated filtering/sorting for the Question Bank.

#### Week 9 (Jan 18 - Jan 22)
- **Dev 4:** Finalize robust seeding data (simulate a full school year of data for demos).
- **Dev 1:** Security Audit (RBAC checks, API rate limiting).
- **All:** Performance tuning (Indexing Postgres & Mongo).

#### Week 10 (Jan 25 - Feb 1)
- **Buffer:** Final regression testing.
- **Deliverable:** Staging environment deployment for Project Manager review.

---

## 3. Team Responsibilities (Adjusted)

| Role | Responsibility Focus |
|------|----------------------|
| **Lead Backend (Dev 1)** | Architecture, DevOps, API Dog Sync, CQRS Event Bus, WebSocket Gateway |
| **Core Logic Dev (Dev 2)** | Assessment Engine (Write-side), Mongo Projections (Read-side), Complex logic |
| **API Dev A (Dev 3)** | Registration, Classroom Mgmt, Read-side APIs |
| **API Dev B (Dev 4)** | Seeding, Testing, Notifications, Parent/Independent flows |

## 4. Collaboration with Frontend

1.  **API Dog is Truth:** The Frontend team builds against the API Dog mocks.
2.  **Mock Controllers:** If a logic piece (like AI grading) isn't ready, we return a successful 200 OK with dummy data defined in API Dog.
3.  **Seeding:** We provide `npm run seed:demo` to give them a working environment immediately.

## 5. Risk Management

| Risk | Mitigation |
|------|------------|
| **Read-Side Complexity** | We delayed Read-side implementation to Week 6 to allow requirements to mature. We will use simple Postgres reads for basic lists in the meantime. |
| **Part-Time Schedule** | Strict adherence to "Sun-Thu" work week. No expectations of weekend work to prevent burnout. |
| **Frontend Dependency** | API Dog mocks must be ready *before* we start coding the implementation. |
