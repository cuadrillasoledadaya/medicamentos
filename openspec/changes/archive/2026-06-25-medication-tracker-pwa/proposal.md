# Proposal: Medication Tracker PWA

A Progressive Web App for families to track medications, schedules, and adherence across multiple patients and caregivers. Built greenfield with React + Vite + TypeScript, backed by Supabase (Postgres + Auth + RLS + Realtime).

## Problem & Opportunity

Families managing multiple medications across patients (elderly parents, children, chronic conditions) rely on ad-hoc methods: paper lists, phone alarms, WhatsApp reminders. These break down when caregivers change, medications shift, or schedules overlap. A shared, offline-friendly PWA with structured schedules, reminder fallbacks, and adherence history solves the coordination gap without requiring app-store installs.

## Goals & Non-Goals

### Goals
- Single source of truth for medications, schedules, and intake history
- Multi-paciente support: one cuidador manages several patients
- Shared family access with role-based permissions (RLS)
- Offline-first: log tomas without connectivity, sync when back online
- Reminder delivery with fallback channels (in-app, email, SMS)
- Temporadas: named treatment periods with auto-rollover of permanent meds
- Modo vacaciones: pause/resume plans per medication
- Stock tracking with reorder alerts
- PDF report export for treating physicians
- Interaction warnings from curated list

### Non-Goals
- Drug catalog API integration (Vademécum, ANMAT, FDA) — manual entry only in v1
- Native mobile app — PWA only
- Billing, insurance, or pharmacy integration
- AI-powered dosage recommendations
- Real-time chat between family members

## Target Users & Personas

| Role | Description | Permissions |
|------|-------------|-------------|
| **Paciente** | The medication taker | Confirms tomas, views own schedule |
| **Cuidador principal** | Admin caregiver (family member) | Full CRUD: meds, schedules, family invites |
| **Cuidador secundario** | Secondary caregiver | Read + register tomas, no structural edits |
| **Médico tratante** | Treating physician | Read-only: receives PDF reports |

### Scenarios

**Happy path**: María (cuidador principal) adds her mother Rosa as a paciente, enters 4 medications with schedules (2x daily, 1x weekly, PRN), enables notifications. Each morning the PWA fires a notification; María taps "Tomada" and the log records. Rosa's doctor receives a monthly PDF adherence report.

**Degraded path**: Juan (cuidador secundario) opens the PWA on a bus with no signal. He sees cached schedules, logs a toma locally. The outbox queues the sync. Notification permission was denied on his device, so he relies on the in-app dashboard alert when he next opens the app.

## Core Feature Set

| Feature | Description | MVP Scope | Out of MVP | Dependencies |
|---------|-------------|-----------|------------|--------------|
| **Auth** | Supabase Auth (email/password) | Email + password, session management | Social login (Google), magic links | Supabase project |
| **Patient CRUD** | Create/edit pacientes under a cuidador | Name, DOB, photo, basic profile | Medical history fields | Auth |
| **Medication CRUD** | Manual entry: name, dosis, units, route | Name, dosis, units, vía, inventario flag | Barcode scan, drug catalog API | Patient CRUD |
| **Schedule CRUD** | Cron-like rules per medication | Weekday rules, time, timezone | Complex recurrence patterns | Medication CRUD |
| **Toma logging** | Record each intake event | Manual + notification action, late/skip/missed | Photo attachment, notes | Schedule CRUD |
| **Reminders** | Web Notifications + fallbacks | In-app + browser notifications | Email, SMS fallback | Schedule CRUD, Edge Functions |
| **Temporadas** | Named treatment periods | Create, close, read-only history | Auto-rollover rules | All above |
| **Family RLS** | Role-based access via Supabase | Cuidador edits, paciente confirms | Secondary caregiver role | Auth, RLS policies |
| **Multi-paciente** | One cuidador, multiple patients | Patient list, switch context | Cross-patient views | Patient CRUD |
| **Interaction warnings** | Curated conflict alerts | Static JSON lookup on schedule add | Real-time API, severity levels | Medication CRUD |
| **Stock alerts** | Track remaining doses | Configurable threshold, "N tomas left" | Auto-reorder suggestions | Medication CRUD |
| **PDF report** | Export adherence history | Client-side @react-pdf/renderer | Scheduled auto-send | Toma logging |
| **Modo vacaciones** | Pause/resume plans | Whole-plan pause, resume date | Per-medication partial pause | Temporadas |

## Tech Stack & Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Frontend** | React + Vite + TypeScript | Mature ecosystem, fast DX, excellent PWA tooling |
| **PWA** | `vite-plugin-pwa` + Workbox | More reliable SW generation than Next.js for PWA-first; Next.js SSR adds friction for offline-first |
| **Backend** | Supabase (Postgres + Auth + RLS + Realtime + Storage + Edge Functions) | Free tier covers 500K Edge Function invocations/month; no infra management |
| **Offline cache** | IndexedDB via `idb` | Standard browser API, reliable, works with Service Worker |
| **Notifications** | Web Notifications API + Service Worker | Native PWA path; iOS limitations documented and mitigated via fallbacks |
| **PDF** | `@react-pdf/renderer` (client-side) | No Edge Function cost, deterministic rendering |
| **Lint/format** | ESLint + Prettier + `tsc --noEmit` | Standard TS toolchain; zero config overhead |
| **Test runner** | **DEFERRED to sdd-design** | Cannot choose until stack scaffolds; Vitest likely but needs confirmation |

## Proposed Data Model (Informational)

**Entities** (full schema in sdd-spec):

- `patients` — id, cuidador_id, name, dob, photo_url, created_at
- `medications` — id, patient_id, name, dosis, unit, route, stock_count, stock_threshold, is_permanent
- `schedules` — id, medication_id, cron_rule, timezone, start_date, end_date, active
- `intake_logs` — id, schedule_id, patient_id, timestamp, status (taken/skipped/missed/late), source (manual/notification), notes
- `temporadas` — id, patient_id, name, start_date, end_date, status (active/closed), created_at
- `plans` — id, patient_id, temporada_id (nullable), is_permanent, created_at — a Plan belongs to a Temporada OR is permanent
- `family_members` — id, patient_id, user_id, role (primary_caregiver/secondary_caregiver/paciente/doctor), status
- `interaction_rules` — id, drug_a, drug_b, severity, description — curated static list or Supabase table

**Schema migration note**: Existing Supabase tables (`medicamentos`, `horarios_medicamentos`, `historial_tomas`, `familiares_acceso`) will be **dropped and recreated** to fit the new Plan + Temporada model. See Risks below.

## Open Product Questions

The following require the medical-domain expert's input before sdd-spec can write definitive specs:

1. **Locale**: Spanish-only for v1, or i18n-ready with English fallback from day one?
2. **Timezone**: Per-user or per-paciente? What happens when a patient travels to a different timezone?
3. **Auth**: Email/password only, or also Google/social login for non-tech-savvy caregivers?
4. **Interaction data source**: Static JSON in the repo, or a Supabase table curated manually by the owner?
5. **Onboarding**: First-run wizard (add patient → add med → schedule → enable notifications) or bare UI with discovery?
6. **Medication photo**: Allow attaching a photo of the pill/box for caregiver reference?
7. **Dosis units catalog**: Free text or a fixed list (mg, ml, gotas, UI, comprimidos)?
8. **Adherence metrics**: Surface "% adherencia últimas 4 semanas" on the dashboard? (adds design complexity but has real medical value)

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| PWA notifications unreliable on iOS backgrounded state | High | Fallback: in-app dashboard alert + email + SMS via Edge Functions |
| Supabase RLS misconfiguration leaks family medical data | Medium | Security test step in sdd-verify: enumerate RLS policies, test cross-user access |
| Destructive schema migration on existing Supabase tables with possible live data | Medium | **Rollback**: export existing data → drop tables → run new migration → restore compatible data. One-step scripted migration. |
| No git repo yet — work is untracked | High | `git init` as first step in sdd-apply, before any code |
| Greenfield + no test runner — TDD deferred | High | Re-enable TDD in sdd-design once stack lands; document test_command in config |

## Rollback Plan

1. **Schema rollback**: If the new Plan + Temporada model breaks existing functionality, run a single migration script that: (a) exports current table data to JSON, (b) drops all new tables, (c) recreates the original four tables (`medicamentos`, `horarios_medicamentos`, `historial_tomas`, `familiares_acceso`), (d) restores data where schema permits.
2. **App rollback**: Revert to the last working git commit. No client-side state persists beyond IndexedDB cache (safe to clear).
3. **RLS rollback**: If RLS policies cause data leaks, immediately set all policies to DENY and restore from the previous policy snapshot.

## Dependencies

- Supabase project provisioned (URL known, anon key held by owner as runtime env var)
- Domain expert answers to the 8 open product questions above
- Git repository initialized before sdd-apply

## Success Criteria (v1)

- [ ] Family uses the PWA daily for at least 30 days without reverting to paper/WhatsApp
- [ ] Zero missed critical doses (as defined by the cuidador) for 30 consecutive days
- [ ] Offline toma logging works and syncs correctly when connectivity resumes
- [ ] PDF report renders correctly and is accepted by the treating physician
- [ ] RLS policies pass security audit: no cross-paciente data leakage

## Phased Delivery

| Slice | Scope | Target |
|-------|-------|--------|
| **1 — MVP** | Auth, patient CRUD, medication CRUD, schedule CRUD, basic browser notifications, manual toma logging, single-paciente, single cuidador | Core loop: add med → schedule → get reminded → log toma |
| **2 — Family** | Multi-paciente, family RLS (primary/secondary roles), in-app fallback alerts, history views | Shared access, accountability |
| **3 — Temporadas** | Temporadas CRUD, modo vacaciones (whole-plan pause), interaction warnings (static JSON) | Treatment lifecycle management |
| **4 — Alerts & Reports** | Stock tracking + reorder alerts, PDF report export, email/SMS fallback via Edge Functions | Proactive management |
| **5 — Polish** | Adherence metrics dashboard, i18n preparation, performance optimization, accessibility audit | Production readiness |
