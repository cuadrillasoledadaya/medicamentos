-- Migration 0008: RLS hardening — explicit UPDATE/DELETE policies
--
-- Problem: `for all` policies on `pacientes` and `plans` did not properly
-- restrict cross-user UPDATE/DELETE operations. User B could UPDATE plans
-- and DELETE pacientes belonging to User A, even though SELECT and INSERT
-- were correctly blocked.
--
-- Root cause: `for all` shorthand policies can behave unpredictably for
-- write operations when combined with `security definer` helper functions
-- (is_cuidador_principal, is_active_family_member) in Supabase's RLS
-- evaluation pipeline.
--
-- Fix: Replace `for all` write policies with explicit per-operation policies
-- that clearly separate INSERT, UPDATE, and DELETE with proper USING /
-- WITH CHECK clauses, following the existing schema patterns.

-- ---------------------------------------------------------------------------
-- Pacientes: replace `for all` with explicit per-operation policies
-- Owner-based check: cuidador_id = auth.uid()
-- ---------------------------------------------------------------------------
drop policy if exists pacientes_write on pacientes;

create policy pacientes_insert on pacientes for insert
  with check (cuidador_id = auth.uid());

create policy pacientes_update on pacientes for update
  using (cuidador_id = auth.uid())
  with check (cuidador_id = auth.uid());

create policy pacientes_delete on pacientes for delete
  using (cuidador_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Plans: replace `for all` with explicit per-operation policies
-- Role-based check: is_cuidador_principal(paciente_id)
-- ---------------------------------------------------------------------------
drop policy if exists plans_write on plans;

create policy plans_insert on plans for insert
  with check (is_cuidador_principal(paciente_id));

create policy plans_update on plans for update
  using (is_cuidador_principal(paciente_id))
  with check (is_cuidador_principal(paciente_id));

create policy plans_delete on plans for delete
  using (is_cuidador_principal(paciente_id));
