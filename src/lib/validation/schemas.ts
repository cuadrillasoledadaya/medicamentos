// Zod validation schemas for all domain entities.

import { z } from 'zod';

const DOSE_UNITS = [
  'mg',
  'ml',
  'gotas',
  'UI',
  'comprimidos',
  'parches',
  'sobres',
  'cucharadas',
  'aplicaciones',
  'inyecciones',
  'otro',
] as const;

export const medicationSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  dose_value: z.number().positive('La dosis debe ser mayor a 0'),
  dose_unit: z.enum(DOSE_UNITS),
  dose_unit_other: z.string(),
  route: z.string().min(1, 'La vía es obligatoria'),
  frequency_hint: z.string(),
  notes: z.string(),
  stock_estimate: z.number().int().min(0),
  low_stock_threshold: z.number().int().min(0),
});

export const scheduleSchema = z.object({
  time_of_day: z.string().min(1, 'La hora es obligatoria'),
  weekday_mask: z.number().int().min(0).max(127),
  timezone_id: z.string().min(1, 'La zona horaria es obligatoria'),
  notes: z.string(),
});

export const pacienteSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  dob: z.string().optional().or(z.literal('')),
  timezone_id: z.string().min(1, 'La zona horaria es obligatoria'),
});

export const temporadaSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  start_date: z.string().min(1, 'La fecha de inicio es obligatoria'),
  end_date: z.string().min(1, 'La fecha de fin es obligatoria'),
});

export const planSchema = z.object({
  medication_id: z.string().uuid(),
  temporada_id: z.string().uuid().optional(),
  notes: z.string(),
});

export const tomaSchema = z.object({
  schedule_id: z.string().uuid(),
  paciente_id: z.string().uuid(),
  scheduled_at: z.string().datetime(),
  status: z.enum(['pending', 'taken_on_time', 'taken_late', 'skipped', 'missed']),
  taken_at: z.string().datetime().nullable(),
  skip_reason: z.string().nullable(),
  notes: z.string().nullable(),
});

export const vacationSchema = z.object({
  paciente_id: z.string().uuid(),
  medication_id: z.string().uuid().nullable(),
  starts_at: z.string().min(1, 'Fecha de inicio requerida'),
  ends_at: z.string().min(1, 'Fecha de fin requerida'),
  reason: z.string().max(500).optional().nullable(),
});

export const stockAdjustSchema = z.object({
  newEstimate: z.number().int().min(0, 'El stock debe ser >= 0'),
  reason: z.string().min(1, 'El motivo es obligatorio'),
});

export type MedicationInput = z.infer<typeof medicationSchema>;
export type ScheduleInput = z.infer<typeof scheduleSchema>;
export type PacienteInput = z.infer<typeof pacienteSchema>;
export type TemporadaInput = z.infer<typeof temporadaSchema>;
export type PlanInput = z.infer<typeof planSchema>;
export type TomaInput = z.infer<typeof tomaSchema>;
export type VacationInput = z.infer<typeof vacationSchema>;
export type StockAdjustInput = z.infer<typeof stockAdjustSchema>;
