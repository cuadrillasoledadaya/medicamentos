import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getPushSubscriptions,
  revokePushSubscription,
  updateNotificationSetting,
} from '@/features/notifications/api';

/**
 * Unit tests for push subscription API wrappers and extended channel union.
 *
 * Run: pnpm vitest run tests/unit/notifications/api.test.ts
 */

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

const mockSupabase = (await import('@/lib/supabase')).supabase as any;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getPushSubscriptions', () => {
  it('returns active subscriptions ordered by created_at desc', async () => {
    const mockData = [
      {
        id: 'sub-1',
        endpoint: 'https://fcm.googleapis.com/abc',
        device_name: 'Chrome on Android',
        is_active: true,
        created_at: '2026-06-26T08:00:00Z',
        last_seen_at: '2026-06-26T09:00:00Z',
      },
    ];

    (mockSupabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
    });

    const result = await getPushSubscriptions();
    expect(result.data).toHaveLength(1);
    expect(result.data![0].device_name).toBe('Chrome on Android');
    expect(result.data![0].is_active).toBe(true);
  });

  it('returns error when Supabase query fails', async () => {
    (mockSupabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'RLS violation' },
      }),
    });

    const result = await getPushSubscriptions();
    expect(result.error).not.toBeNull();
    expect(result.error!.message).toBe('Failed to list subscriptions: RLS violation');
  });
});

describe('revokePushSubscription', () => {
  it('marks subscription as inactive by id', async () => {
    (mockSupabase.from as any).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const result = await revokePushSubscription('sub-123');
    expect(result.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith('push_subscriptions');
  });

  it('returns error when revoke fails', async () => {
    (mockSupabase.from as any).mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      }),
    });

    const result = await revokePushSubscription('nonexistent');
    expect(result.error).not.toBeNull();
    expect(result.error!.message).toBe('Failed to revoke subscription: Not found');
  });
});

describe('updateNotificationSetting channel union', () => {
  it('accepts web_push as a valid channel', async () => {
    (mockSupabase.from as any).mockReturnValue({
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          paciente_id: 'pac-1',
          channel: 'web_push',
          enabled: true,
        },
        error: null,
      }),
    });

    const result = await updateNotificationSetting('pac-1', 'web_push', true);
    expect(result.error).toBeNull();
    expect(result.data?.channel).toBe('web_push');
  });
});
