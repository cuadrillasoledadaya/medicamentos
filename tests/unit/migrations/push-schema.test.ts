import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * SQL migration schema tests for PR 1.
 *
 * These tests parse migration SQL files and assert they contain the expected
 * DDL statements, columns, constraints, and RLS policies. This is the
 * lightweight TDD approach for SQL migrations when no Postgres test harness
 * (pg-mem, testcontainers) is available.
 *
 * Run: pnpm vitest run tests/unit/migrations/push-schema.test.ts
 */

function readMigration(filename: string): string {
  const path = resolve(
    process.cwd(),
    'supabase/migrations',
    filename,
  );
  return readFileSync(path, 'utf-8');
}

describe('Migration 0011 — push_subscriptions table', () => {
  it('file exists and contains CREATE TABLE push_subscriptions', () => {
    const sql = readMigration('0011_push_subscriptions.sql');
    expect(sql).toMatch(/create\s+table\s+(public\.)?push_subscriptions\s*\(/i);
  });

  it('has id uuid primary key', () => {
    const sql = readMigration('0011_push_subscriptions.sql');
    expect(sql).toMatch(/id\s+uuid\s+primary\s+key/i);
  });

  it('has user_id referencing auth.users', () => {
    const sql = readMigration('0011_push_subscriptions.sql');
    expect(sql).toMatch(/user_id\s+uuid\s+not\s+null\s+references\s+auth\.users/i);
  });

  it('has endpoint text unique', () => {
    const sql = readMigration('0011_push_subscriptions.sql');
    expect(sql).toMatch(/endpoint\s+text\s+(not\s+null\s+)?unique/i);
  });

  it('has p256dh text column', () => {
    const sql = readMigration('0011_push_subscriptions.sql');
    expect(sql).toMatch(/p256dh\s+text/i);
  });

  it('has auth text column', () => {
    const sql = readMigration('0011_push_subscriptions.sql');
    expect(sql).toMatch(/\bauth\s+text/i);
  });

  it('has device_name text column', () => {
    const sql = readMigration('0011_push_subscriptions.sql');
    expect(sql).toMatch(/device_name\s+text/i);
  });

  it('has is_active boolean default true', () => {
    const sql = readMigration('0011_push_subscriptions.sql');
    expect(sql).toMatch(/is_active\s+boolean\s+(not\s+null\s+)?default\s+true/i);
  });

  it('has created_at timestamptz', () => {
    const sql = readMigration('0011_push_subscriptions.sql');
    expect(sql).toMatch(/created_at\s+timestamptz/i);
  });

  it('has last_seen_at timestamptz', () => {
    const sql = readMigration('0011_push_subscriptions.sql');
    expect(sql).toMatch(/last_seen_at\s+timestamptz/i);
  });

  it('enables RLS on push_subscriptions', () => {
    const sql = readMigration('0011_push_subscriptions.sql');
    expect(sql).toMatch(/alter\s+table\s+(public\.)?push_subscriptions\s+enable\s+row\s+level\s+security/i);
  });

  it('has a read policy for owner (user_id = auth.uid())', () => {
    const sql = readMigration('0011_push_subscriptions.sql');
    expect(sql).toMatch(/for\s+select/i);
    expect(sql).toMatch(/user_id\s*=\s*auth\.uid\(\)/i);
  });

  it('has an insert policy for owner', () => {
    const sql = readMigration('0011_push_subscriptions.sql');
    expect(sql).toMatch(/for\s+insert/i);
    expect(sql).toMatch(/user_id\s*=\s*auth\.uid\(\)/i);
  });

  it('has an update policy for owner', () => {
    const sql = readMigration('0011_push_subscriptions.sql');
    expect(sql).toMatch(/for\s+update/i);
    expect(sql).toMatch(/user_id\s*=\s*auth\.uid\(\)/i);
  });

  it('has a read policy for family members via is_active_family_member or family_members join', () => {
    const sql = readMigration('0011_push_subscriptions.sql');
    // At least one select policy references is_active_family_member or family_members for cuidador_principal diagnostics
    const selectPolicies = sql.match(/create\s+policy\s+\w+\s+on\s+push_subscriptions\s+for\s+select/gi);
    expect(selectPolicies).not.toBeNull();
    expect(selectPolicies!.length).toBeGreaterThanOrEqual(1);
    // The policy should reference either is_active_family_member or family_members table
    expect(sql).toMatch(/is_active_family_member|family_members/i);
  });
});

describe('Migration 0012 — notification_deliveries table', () => {
  it('file exists and contains CREATE TABLE notification_deliveries', () => {
    const sql = readMigration('0012_notification_deliveries.sql');
    expect(sql).toMatch(/create\s+table\s+(public\.)?notification_deliveries\s*\(/i);
  });

  it('has id uuid primary key', () => {
    const sql = readMigration('0012_notification_deliveries.sql');
    expect(sql).toMatch(/id\s+uuid\s+primary\s+key/i);
  });

  it('has toma_id referencing tomas', () => {
    const sql = readMigration('0012_notification_deliveries.sql');
    expect(sql).toMatch(/toma_id\s+uuid\s+not\s+null\s+references\s+(public\.)?tomas/i);
  });

  it('has subscription_id referencing push_subscriptions', () => {
    const sql = readMigration('0012_notification_deliveries.sql');
    expect(sql).toMatch(/subscription_id\s+uuid\s+not\s+null\s+references\s+(public\.)?push_subscriptions/i);
  });

  it('has channel text column', () => {
    const sql = readMigration('0012_notification_deliveries.sql');
    expect(sql).toMatch(/channel\s+text/i);
  });

  it('has sent_at timestamptz', () => {
    const sql = readMigration('0012_notification_deliveries.sql');
    expect(sql).toMatch(/sent_at\s+timestamptz/i);
  });

  it('has status with check constraint for success/failure', () => {
    const sql = readMigration('0012_notification_deliveries.sql');
    expect(sql).toMatch(/status\s+text/i);
    expect(sql).toMatch(/check\s*\(.*status\s+in\s*\(\s*['"]success['"]\s*,\s*['"]failure['"]\s*\)/i);
  });

  it('has error_message text nullable', () => {
    const sql = readMigration('0012_notification_deliveries.sql');
    expect(sql).toMatch(/error_message\s+text/i);
  });

  it('enables RLS on notification_deliveries', () => {
    const sql = readMigration('0012_notification_deliveries.sql');
    expect(sql).toMatch(/alter\s+table\s+(public\.)?notification_deliveries\s+enable\s+row\s+level\s+security/i);
  });

  it('has a read policy for family members', () => {
    const sql = readMigration('0012_notification_deliveries.sql');
    expect(sql).toMatch(/for\s+select/i);
    expect(sql).toMatch(/is_active_family_member/i);
  });

  it('has an insert policy for owner/cuidador_principal', () => {
    const sql = readMigration('0012_notification_deliveries.sql');
    expect(sql).toMatch(/for\s+insert/i);
  });
});

describe('Migration 0013 — extend notification_channel enum', () => {
  it('file exists', () => {
    const sql = readMigration('0013_extend_notification_channel_enum.sql');
    expect(sql.length).toBeGreaterThan(0);
  });

  it('contains ALTER TYPE notification_channel ADD VALUE web_push', () => {
    const sql = readMigration('0013_extend_notification_channel_enum.sql');
    expect(sql).toMatch(/alter\s+type\s+notification_channel\s+add\s+value\s+(if\s+not\s+exists\s+)?['"]web_push['"]/i);
  });

  it('is a single-statement migration (no BEGIN/COMMIT, no other DDL)', () => {
    const sql = readMigration('0013_extend_notification_channel_enum.sql');
    const stripped = sql
      .replace(/--.*$/gm, '') // remove comments
      .replace(/\s+/g, ' ')
      .trim();
    // Should contain only the ALTER TYPE statement (plus optional comment header)
    expect(stripped).not.toMatch(/begin\b/i);
    expect(stripped).not.toMatch(/create\s+table/i);
    expect(stripped).not.toMatch(/commit\b/i);
  });
});

describe('Migration 0014 — tomas_due_for_push view', () => {
  it('file exists and contains CREATE VIEW tomas_due_for_push', () => {
    const sql = readMigration('0014_push_due_view.sql');
    expect(sql).toMatch(/create\s+(or\s+replace\s+)?view\s+(public\.)?tomas_due_for_push/i);
  });

  it('joins tomas with medications', () => {
    const sql = readMigration('0014_push_due_view.sql');
    expect(sql).toMatch(/from\s+(public\.)?tomas/i);
    expect(sql).toMatch(/join\s+(public\.)?medications/i);
  });

  it('joins with pacientes', () => {
    const sql = readMigration('0014_push_due_view.sql');
    expect(sql).toMatch(/join\s+(public\.)?pacientes/i);
  });

  it('filters by status pending', () => {
    const sql = readMigration('0014_push_due_view.sql');
    expect(sql).toMatch(/status\s*=\s*['"]pending['"]/i);
  });

  it('has 5-minute delivery window', () => {
    const sql = readMigration('0014_push_due_view.sql');
    expect(sql).toMatch(/5\s*minutes/i);
  });

  it('selects medication_name column', () => {
    const sql = readMigration('0014_push_due_view.sql');
    expect(sql).toMatch(/medication_name/i);
  });

  it('selects dose_value column', () => {
    const sql = readMigration('0014_push_due_view.sql');
    expect(sql).toMatch(/dose_value/i);
  });

  it('selects paciente_name column', () => {
    const sql = readMigration('0014_push_due_view.sql');
    expect(sql).toMatch(/paciente_name/i);
  });
});

describe('Migration 0015 — push_dispatch_cron', () => {
  it('file exists and contains cron.schedule call', () => {
    const sql = readMigration('0015_push_dispatch_cron.sql');
    expect(sql).toMatch(/cron\.schedule\s*\(/i);
  });

  it('schedules job every minute', () => {
    const sql = readMigration('0015_push_dispatch_cron.sql');
    expect(sql).toMatch(/\*\s+\*\s+\*\s+\*\s+\*/);
  });

  it('calls materialize_due_pushes or dispatch_push_for_due_tomas function', () => {
    const sql = readMigration('0015_push_dispatch_cron.sql');
    expect(sql).toMatch(/materialize_due_pushes|dispatch_push_for_due_tomas/i);
  });

  it('creates get_active_push_subscribers function returning setof push_subscriptions', () => {
    const sql = readMigration('0015_push_dispatch_cron.sql');
    expect(sql).toMatch(/create\s+(or\s+replace\s+)?function\s+(public\.)?get_active_push_subscribers/i);
    expect(sql).toMatch(/returns\s+setof\s+(public\.)?push_subscriptions/i);
  });

  it('creates materialize_due_pushes function that queries tomas_due_for_push', () => {
    const sql = readMigration('0015_push_dispatch_cron.sql');
    expect(sql).toMatch(/create\s+(or\s+replace\s+)?function\s+(public\.)?materialize_due_pushes/i);
    expect(sql).toMatch(/tomas_due_for_push/i);
  });

  it('uses net.http_post to call notify-fallback Edge Function', () => {
    const sql = readMigration('0015_push_dispatch_cron.sql');
    expect(sql).toMatch(/net\.http_post/i);
    expect(sql).toMatch(/notify-fallback/i);
  });

  it('references app.settings.supabase_url GUC setting', () => {
    const sql = readMigration('0015_push_dispatch_cron.sql');
    expect(sql).toMatch(/current_setting\s*\(\s*['"]app\.supabase_url['"]\s*\)/i);
  });

  it('references app.settings.supabase_service_role_key GUC setting', () => {
    const sql = readMigration('0015_push_dispatch_cron.sql');
    expect(sql).toMatch(/current_setting\s*\(\s*['"]app\.supabase_service_role_key['"]\s*\)/i);
  });

  it('creates snooze_toma RPC function', () => {
    const sql = readMigration('0015_push_dispatch_cron.sql');
    expect(sql).toMatch(/create\s+(or\s+replace\s+)?function\s+(public\.)?snooze_toma/i);
    expect(sql).toMatch(/snoozed_until\s*=\s*now\(\)\s*\+\s*interval/i);
  });

  it('uses security definer on functions that call net.http_post', () => {
    const sql = readMigration('0015_push_dispatch_cron.sql');
    expect(sql).toMatch(/security\s+definer/i);
  });
});
