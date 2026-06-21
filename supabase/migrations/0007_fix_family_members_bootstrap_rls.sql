-- Migration 0007: Fix family_members bootstrap RLS paradox.
--
-- The family_members_write policy requires is_cuidador_principal(paciente_id),
-- but that function reads from family_members — creating a chicken-and-egg
-- where the first row can never be inserted.
--
-- This bootstrap policy allows the paciente's owner (cuidador_id) to insert
-- their own first family_members row. The existing family_members_write policy
-- still governs all subsequent inserts.

create policy family_members_bootstrap on family_members for insert
  with check (
    exists (
      select 1 from pacientes
      where pacientes.id = paciente_id
        and pacientes.cuidador_id = auth.uid()
    )
  );
