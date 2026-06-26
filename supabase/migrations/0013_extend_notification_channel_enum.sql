-- Migration 0013: Extend notification_channel enum with 'web_push'
--
-- SINGLE-STATEMENT MIGRATION — do NOT add any other DDL to this file.
-- ALTER TYPE … ADD VALUE cannot share a transaction with DDL that uses
-- the new enum value on Postgres ≤15. This file contains exactly one
-- statement; the new value is usable starting in the next migration.

alter type notification_channel add value if not exists 'web_push';
