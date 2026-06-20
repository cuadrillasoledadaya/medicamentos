// MedicationOverrideList — per-medication notification override toggles.

import { useMedications } from '../medications/hooks';
import { useMedicationOverrides, useSetMedicationOverride } from './hooks';

const channels = [
  { key: 'in_app' as const, label: 'App' },
  { key: 'email' as const, label: 'Email' },
  { key: 'sms' as const, label: 'SMS' },
];

interface Props {
  pacienteId: string;
}

export function MedicationOverrideList({ pacienteId }: Props) {
  const { data: medications, isLoading: medsLoading } = useMedications(pacienteId);
  const { data: overrides, isLoading: overridesLoading } = useMedicationOverrides(pacienteId);
  const setOverride = useSetMedicationOverride();

  if (medsLoading || overridesLoading) {
    return <p style={{ padding: '1rem', color: '#888' }}>Cargando medicamentos...</p>;
  }

  const activeMeds = medications?.filter((m) => m.active) ?? [];

  if (activeMeds.length === 0) {
    return (
      <div style={{ padding: '1rem' }}>
        <h3 style={{ margin: '0 0 0.5rem' }}>Overrides por medicamento</h3>
        <p style={{ color: '#888', fontSize: '0.875rem' }}>No hay medicamentos activos.</p>
      </div>
    );
  }

  const isOverrideEnabled = (medicationId: string, channel: string): boolean => {
    const found = overrides?.find(
      (o) => o.medication_id === medicationId && o.channel === channel,
    );
    // Default: inherit (enabled = true if not explicitly disabled)
    return found ? found.enabled : true;
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h3 style={{ margin: '0 0 0.75rem' }}>Overrides por medicamento</h3>
      <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '1rem' }}>
        Desactiva notificaciones para un medicamento específico. Si no se configura, hereda los ajustes generales.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {activeMeds.map((med) => (
          <div
            key={med.id}
            style={{
              padding: '0.75rem',
              background: '#fff',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              {med.name}{' '}
              <span style={{ fontWeight: 400, color: '#888' }}>
                ({med.dose_value} {med.dose_unit === 'other' ? med.dose_unit_other : med.dose_unit})
              </span>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              {channels.map(({ key, label }) => {
                const enabled = isOverrideEnabled(med.id, key);
                return (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={() => {
                        setOverride.mutate({
                          pacienteId,
                          medicationId: med.id,
                          channel: key,
                          enabled: !enabled,
                        });
                      }}
                      disabled={setOverride.isPending}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
