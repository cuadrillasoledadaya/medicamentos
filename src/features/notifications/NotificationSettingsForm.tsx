// NotificationSettingsForm — per-channel toggles for a paciente.

import { useState } from 'react';
import { useNotificationSettings, useUpdateNotificationSetting } from './hooks';
import { requestNotificationPermission, getNotificationReliability, requestPushSubscription } from './scheduler';
import { IosInstallBadge } from './IosInstallBadge';
import { DeviceList } from './DeviceList';

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
  { key: 'web_push' as const, label: 'Notificaciones push del navegador', alwaysAvailable: true },
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
  const [pushError, setPushError] = useState<string | null>(null);

  if (isLoading) return <p>Cargando ajustes de notificaciones...</p>;

  const isEnabled = (channel: string) => {
    const found = settings?.find((s) => s.channel === channel);
    if (found) return found.enabled;
    // Defaults: in_app ON, email OFF, sms OFF, web_push OFF
    return channel === 'in_app';
  };

  const handleToggle = async (
    channel: 'in_app' | 'email' | 'sms' | 'web_push',
    currentEnabled: boolean,
  ) => {
    if (channel === 'in_app' && !currentEnabled) {
      // Request permission when enabling in_app
      const result = await requestNotificationPermission();
      setPermissionStatus(result);
      if (result !== 'granted') return;
    }

    if (channel === 'web_push' && !currentEnabled) {
      // Request push subscription when enabling web_push
      setPushError(null);
      const result = await requestPushSubscription();
      if (!result.ok) {
        if (result.reason === 'ios-not-standalone') {
          setPushError('En iPhone, las notificaciones push solo funcionan si la app está instalada en tu pantalla de inicio.');
        } else {
          setPushError(`No se pudo activar: ${result.reason}`);
        }
        return;
      }
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
  const webPushEnabled = isEnabled('web_push');

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

      {/* iOS install badge — shown above toggles when relevant */}
      <IosInstallBadge />

      {/* Push error message */}
      {pushError && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            marginBottom: '0.75rem',
            fontSize: '0.85rem',
            color: '#dc2626',
          }}
          role="alert"
        >
          {pushError}
        </div>
      )}

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

      {/* Device list — shown when web_push is enabled */}
      {webPushEnabled && <DeviceList />}
    </div>
  );
}
