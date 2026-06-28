-- Migration 0022: push alert behavior toggles
-- Adds 4 BOOLEAN NOT NULL DEFAULT TRUE columns on notification_settings
-- for the web_push channel. Idempotent — safe to apply on fresh or existing DBs.
-- No indexes: the table is one row per (paciente, medication_id, channel) and
-- we always filter by (paciente_id, medication_id IS NULL, channel = 'web_push'),
-- which the existing notification_settings_lookup_idx already covers.

ALTER TABLE notification_settings
  ADD COLUMN IF NOT EXISTS require_interaction BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE notification_settings
  ADD COLUMN IF NOT EXISTS vibrate            BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE notification_settings
  ADD COLUMN IF NOT EXISTS renotify           BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE notification_settings
  ADD COLUMN IF NOT EXISTS badge              BOOLEAN NOT NULL DEFAULT TRUE;
