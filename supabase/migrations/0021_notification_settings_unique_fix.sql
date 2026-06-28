-- Migration 0021: notification_settings UNIQUE NULLS NOT DISTINCT
-- Captures the production state of the constraint (already live, missing from repo)
-- Idempotent: safe to apply to a fresh DB or to a DB that already has the constraint

ALTER TABLE notification_settings
  DROP CONSTRAINT IF EXISTS notification_settings_unique;

ALTER TABLE notification_settings
  ADD CONSTRAINT notification_settings_unique
  UNIQUE NULLS NOT DISTINCT (paciente_id, medication_id, channel);
