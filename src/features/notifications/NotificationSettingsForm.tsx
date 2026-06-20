// NotificationSettingsForm — per-channel toggles for a paciente.

import { useState } from 'react';
import { useNotificationSettings, useUpdateNotificationSetting } from './hooks';
import { requestNotificationPermission, getNotificationReliability } from './scheduler';

/**
 * Detect which notification channels are available based on env vars.
 * Mirrors what notify-fallback/index.ts reads: RESEND_API_KEY, TWILIO_*.
 */
function getAvailableChannels(): { email: boolean; sms: boolean } {
  return {
    email: !!import.meta.env.VITE_RESEND_API_KEY,
    sms: !!(
      import.meta.env.VITE_TWILIO_ACCOUNT_SID &&
      import.meta.env.VITE_TWILIO_AUTH_TOKEN &&
      import.meta.env.VITE_TWILIO_FROM_NUMBER
    ),
  };
}

const channelDefs = [
  { key: 'in_app' as const, label: 'Notificaciones en la app', alwaysAvailable: true },
  { key: 'email' as const, label: 'Correo electrónico', alwaysAvailable: false, envKey: 'email' as const },
  { key: 'sms' as const, label: 'SMS', alwaysAvailable: false, envKey: 'sms' as const },
];

interface Props {
  pacienteId: string;
}

export function NotificationSettingsForm({ pacienteId }: Props) {
  const { data: settings, isLoading } = useNotificationSettings(pacienteId);
  const updateMutation = useUpdateNotificationSetting();
  const [permissionStatus, setPermissionStatus] = useState<string>(
    getNotificationReliability(),
  );

  if (isLoading) return <p>Cargando ajustes de notificaciones...</p>;

  const isEnabled = (channel: string) => {
    const found = settings?.find((s) => s.channel === channel);
    if (found) return found.enabled;
    // Defaults: in_app ON, email OFF, sms OFF
    return channel === 'in_app';
  };

  const handleToggle = async (
    channel: 'in_app' | 'email' | 'sms',
    currentEnabled: boolean,
  ) => {
    if (channel === 'in_app' && !currentEnabled) {
      // Request permission when enabling in_app
      const result = await requestNotificationPermission();
      setPermissionStatus(result);
      if (result !== 'granted') return;
    }

    updateMutation.mutate({
      pacienteId,
      channel,
      enabled: !currentEnabled,
    });
  };

  const reliabilityLabel: Record<string, string> = {
    green: 'Notificaciones activas',
    yellow: 'iOS — solo notificaciones dentro de la app',
    red: 'Permiso denegado',
  };

  const reliabilityColor: Record<string, string> = {
    green: '#16a34a',
    yellow: '#f59e0b',
    red: '#dc2626',
  };

  const availableChannels = getAvailableChannels();

  return (
    <div style={{ padding: '1rem' }}>
      <h3 style={{ margin: '0 0 0.5rem' }}>Notificaciones</h3>

      {/* Reliability indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1rem',
          padding: '0.5rem',
          borderRadius: '4px',
          background: `${reliabilityColor[permissionStatus]}15`,
        }}
      >
        <span
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: reliabilityColor[permissionStatus],
            display: 'inline-block',
          }}
        />
        <span style={{ fontSize: '0.85rem', color: reliabilityColor[permissionStatus] }}>
          {reliabilityLabel[permissionStatus]}
        </span>
      </div>

      {/* Channel toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {channelDefs.map(({ key, label, alwaysAvailable, envKey }) => {
          const enabled = isEnabled(key);
          const envAvailable = alwaysAvailable || (envKey ? availableChannels[envKey] : false);
          const available = envAvailable;

          return (
            <label
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                opacity: available ? 1 : 0.5,
              }}
            >
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => handleToggle(key, enabled)}
                disabled={!available || updateMutation.isPending}
              />
              <span>{label}</span>
              {!alwaysAvailable && (
                <span style={{ fontSize: '0.75rem', color: '#888' }}>
                  {available
                    ? enabled
                      ? '(activo)'
                      : '(desactivado)'
                    : '(requiere configuración del servidor)'}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
