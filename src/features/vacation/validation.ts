// Zod validation schemas for vacation form.

import { z } from 'zod';

export const vacationSchema = z.object({
  scope: z.enum(['global', 'per_medication']),
  medication_id: z.string().uuid().nullable(),
  starts_at: z.string().min(1, 'Fecha de inicio requerida'),
  ends_at: z.string().min(1, 'Fecha de fin requerida'),
  reason: z.string().max(500).optional().nullable(),
}).refine((data) => {
  if (data.scope === 'per_medication' && !data.medication_id) {
    return {
      success: false,
      error: { issues: [{ path: ['medication_id'], message: 'Selecciona un medicamento' }] },
    };
  }
  if (new Date(data.ends_at) <= new Date(data.starts_at)) {
    return {
      success: false,
      error: { issues: [{ path: ['ends_at'], message: 'La fecha de fin debe ser posterior a la de inicio' }] },
    };
  }
  return { success: true };
});

export type VacationFormData = z.infer<typeof vacationSchema>;
