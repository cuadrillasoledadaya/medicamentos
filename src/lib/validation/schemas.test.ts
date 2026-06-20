import { describe, it, expect } from 'vitest';
import {
  medicationSchema,
  scheduleSchema,
  pacienteSchema,
  temporadaSchema,
  tomaSchema,
  vacationSchema,
  stockAdjustSchema,
} from '@/lib/validation/schemas';

describe('medicationSchema', () => {
  it('accepts a valid payload', () => {
    const valid = {
      name: 'Paracetamol',
      dose_value: 500,
      dose_unit: 'mg',
      dose_unit_other: '',
      route: 'oral',
      frequency_hint: 'cada 8 horas',
      notes: '',
      stock_estimate: 20,
      low_stock_threshold: 7,
    };
    expect(medicationSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty name', () => {
    const invalid = {
      name: '',
      dose_value: 500,
      dose_unit: 'mg',
      dose_unit_other: '',
      route: 'oral',
      frequency_hint: '',
      notes: '',
      stock_estimate: 20,
      low_stock_threshold: 7,
    };
    const result = medicationSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects zero or negative dose_value', () => {
    const invalid = {
      name: 'Paracetamol',
      dose_value: 0,
      dose_unit: 'mg',
      dose_unit_other: '',
      route: 'oral',
      frequency_hint: '',
      notes: '',
      stock_estimate: 20,
      low_stock_threshold: 7,
    };
    expect(medicationSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects invalid dose_unit', () => {
    const invalid = {
      name: 'Paracetamol',
      dose_value: 500,
      dose_unit: 'invalid_unit',
      dose_unit_other: '',
      route: 'oral',
      frequency_hint: '',
      notes: '',
      stock_estimate: 20,
      low_stock_threshold: 7,
    };
    expect(medicationSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects negative stock_estimate', () => {
    const invalid = {
      name: 'Paracetamol',
      dose_value: 500,
      dose_unit: 'mg',
      dose_unit_other: '',
      route: 'oral',
      frequency_hint: '',
      notes: '',
      stock_estimate: -1,
      low_stock_threshold: 7,
    };
    expect(medicationSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('scheduleSchema', () => {
  it('accepts a valid payload', () => {
    const valid = {
      time_of_day: '08:00',
      weekday_mask: 62, // Mon-Fri
      timezone_id: 'America/Argentina/Buenos_Aires',
      notes: '',
    };
    expect(scheduleSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty time_of_day', () => {
    const invalid = {
      time_of_day: '',
      weekday_mask: 62,
      timezone_id: 'America/Argentina/Buenos_Aires',
      notes: '',
    };
    expect(scheduleSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects weekday_mask out of range', () => {
    const invalid = {
      time_of_day: '08:00',
      weekday_mask: 128, // max is 127 (7 bits)
      timezone_id: 'America/Argentina/Buenos_Aires',
      notes: '',
    };
    expect(scheduleSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects negative weekday_mask', () => {
    const invalid = {
      time_of_day: '08:00',
      weekday_mask: -1,
      timezone_id: 'America/Argentina/Buenos_Aires',
      notes: '',
    };
    expect(scheduleSchema.safeParse(invalid).success).toBe(false);
  });

  it('accepts weekday_mask = 0 (no days)', () => {
    const valid = {
      time_of_day: '08:00',
      weekday_mask: 0,
      timezone_id: 'UTC',
      notes: '',
    };
    expect(scheduleSchema.safeParse(valid).success).toBe(true);
  });
});

describe('pacienteSchema', () => {
  it('accepts a valid payload', () => {
    const valid = {
      name: 'Juan Pérez',
      dob: '1980-05-15',
      timezone_id: 'America/Argentina/Buenos_Aires',
    };
    expect(pacienteSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts empty dob', () => {
    const valid = {
      name: 'Juan Pérez',
      dob: '',
      timezone_id: 'America/Argentina/Buenos_Aires',
    };
    expect(pacienteSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty name', () => {
    const invalid = {
      name: '',
      dob: '1980-05-15',
      timezone_id: 'America/Argentina/Buenos_Aires',
    };
    expect(pacienteSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects empty timezone_id', () => {
    const invalid = {
      name: 'Juan Pérez',
      dob: '1980-05-15',
      timezone_id: '',
    };
    expect(pacienteSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('temporadaSchema', () => {
  it('accepts a valid payload', () => {
    const valid = {
      name: 'Verano 2024',
      start_date: '2024-01-01',
      end_date: '2024-03-31',
    };
    expect(temporadaSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects empty name', () => {
    const invalid = {
      name: '',
      start_date: '2024-01-01',
      end_date: '2024-03-31',
    };
    expect(temporadaSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects empty start_date', () => {
    const invalid = {
      name: 'Verano 2024',
      start_date: '',
      end_date: '2024-03-31',
    };
    expect(temporadaSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('tomaSchema', () => {
  it('accepts a valid pending toma', () => {
    const valid = {
      schedule_id: '550e8400-e29b-41d4-a716-446655440000',
      paciente_id: '550e8400-e29b-41d4-a716-446655440001',
      scheduled_at: '2024-01-15T08:00:00Z',
      status: 'pending',
      taken_at: null,
      skip_reason: null,
      notes: null,
    };
    expect(tomaSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a valid taken_on_time toma', () => {
    const valid = {
      schedule_id: '550e8400-e29b-41d4-a716-446655440000',
      paciente_id: '550e8400-e29b-41d4-a716-446655440001',
      scheduled_at: '2024-01-15T08:00:00Z',
      status: 'taken_on_time',
      taken_at: '2024-01-15T08:05:00Z',
      skip_reason: null,
      notes: null,
    };
    expect(tomaSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects invalid status', () => {
    const invalid = {
      schedule_id: '550e8400-e29b-41d4-a716-446655440000',
      paciente_id: '550e8400-e29b-41d4-a716-446655440001',
      scheduled_at: '2024-01-15T08:00:00Z',
      status: 'invalid_status',
      taken_at: null,
      skip_reason: null,
      notes: null,
    };
    expect(tomaSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('vacationSchema', () => {
  it('accepts a valid GLOBAL vacation (medication_id = null)', () => {
    const valid = {
      paciente_id: '550e8400-e29b-41d4-a716-446655440000',
      medication_id: null,
      starts_at: '2024-06-01',
      ends_at: '2024-06-15',
      reason: 'Viaje familiar',
    };
    expect(vacationSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a valid PER_MEDICATION vacation', () => {
    const valid = {
      paciente_id: '550e8400-e29b-41d4-a716-446655440000',
      medication_id: '550e8400-e29b-41d4-a716-446655440001',
      starts_at: '2024-06-01',
      ends_at: '2024-06-15',
      reason: null,
    };
    expect(vacationSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects reason longer than 500 chars', () => {
    const invalid = {
      paciente_id: '550e8400-e29b-41d4-a716-446655440000',
      medication_id: null,
      starts_at: '2024-06-01',
      ends_at: '2024-06-15',
      reason: 'x'.repeat(501),
    };
    expect(vacationSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('stockAdjustSchema', () => {
  it('accepts a valid adjustment', () => {
    const valid = {
      newEstimate: 15,
      reason: 'Recount after pharmacy visit',
    };
    expect(stockAdjustSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects negative newEstimate', () => {
    const invalid = {
      newEstimate: -1,
      reason: 'Error correction',
    };
    expect(stockAdjustSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects empty reason', () => {
    const invalid = {
      newEstimate: 15,
      reason: '',
    };
    expect(stockAdjustSchema.safeParse(invalid).success).toBe(false);
  });

  it('accepts zero newEstimate', () => {
    const valid = {
      newEstimate: 0,
      reason: 'All used up',
    };
    expect(stockAdjustSchema.safeParse(valid).success).toBe(true);
  });
});
