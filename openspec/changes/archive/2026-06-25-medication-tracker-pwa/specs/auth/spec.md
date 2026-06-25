# Auth Domain Specification

## Purpose

Defines user authentication using Supabase Auth (email/password + Google OAuth), session management, and the user-roles model on top of Supabase Auth.

---

## Requirements

### Requirement: Supabase Auth Providers

The system SHALL support two authentication methods via Supabase Auth:

1. **Email/Password**: default Supabase email/password signup with email confirmation required.
2. **Google OAuth**: via Supabase Auth Google provider.

The system SHALL use environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for all Supabase client initialization.

#### Scenario: Email/password signup

- GIVEN a new user provides email and password
- WHEN they submit the signup form
- THEN Supabase Auth SHALL create the user with `email_confirm = false`
- AND Supabase SHALL send a confirmation email to the provided address
- AND the user SHALL not be able to log in until email is confirmed

#### Scenario: Google OAuth signup

- GIVEN a user clicks "Sign in with Google"
- WHEN the OAuth flow completes successfully
- THEN Supabase Auth SHALL upsert a `users` record and return a session
- AND the system SHALL create a `family_members` entry if the user is a paciente self-registering

### Requirement: Password Reset

The system SHALL delegate password reset to Supabase Auth's built-in reset flow (`supabase.auth.resetPasswordForEmail`). No custom reset endpoint is required.

### Requirement: User-Roles Model

The system SHALL distinguish between two role categories stored in `family_members.role`:

- **Paciente-related roles**: `owner_paciente`, `cuidador_principal`, `cuidador_secundario`, `medico` — these attach to a specific paciente via `family_members.paciente_id`
- **Platform-level role**: there is no separate `admin` or `superadmin` table in v1; the first `cuidador_principal` of a paciente is determined by `pacientes.cuidador_id`

#### Scenario: First cuidador is owner

- GIVEN a user creates a new paciente record
- WHEN the paciente is created
- THEN the system SHALL insert a `family_members` row with `role = 'cuidador_principal'` and `status = 'active'` for that user
- AND `pacientes.cuidador_id` SHALL be set to that user's `auth.users.id`

### Requirement: Session Management

The Supabase JS client SHALL manage the session using `supabase.auth.getSession()` and `supabase.auth.onAuthStateChange()`. The Service Worker SHALL listen for `auth_state_change` events to keep the IndexedDB cache consistent with the current user's permissions.

#### Scenario: Session persists across page reloads

- GIVEN a user is authenticated
- WHEN they reload the PWA page
- THEN the Supabase client SHALL restore the session without requiring re-login
- AND `onAuthStateChange` SHALL fire with `SIGNED_IN`
