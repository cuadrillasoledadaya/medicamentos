// NotificationSettingsForm — per-channel toggles for a paciente.

import { useState } from 'react';
import { useNotificationSettings, useUpdateNotificationSetting } from './hooks';
import { requestNotificationPermission, getNotificationReliability, requestPushSubscription, mapSubscriptionErrorToSpanish } from './scheduler';
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

type PushSubscriptionState = 'idle' | 'pending' | 'subscribed' | 'failed';

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
  const [pushSubscriptionState, setPushSubscriptionState] = useState<PushSubscriptionState>('idle');

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
      // Save preference FIRST, then attempt push handshake
      setPushError(null);
      updateMutation.mutate({
        pacienteId,
        channel,
        enabled: true,
      });
      setPushSubscriptionState('pending');
      const result = await requestPushSubscription();
      if (!result.ok) {
        if (result.reason === 'ios-not-standalone') {
          setPushError('En iPhone, las notificaciones push solo funcionan si la app está instalada en tu pantalla de inicio.');
        } else {
          setPushError(mapSubscriptionErrorToSpanish(result.reason));
        }
        setPushSubscriptionState('failed');
        return;
      }
      setPushSubscriptionState('subscribed');
      return;
    }

    // Disabling web_push or any other channel
    if (channel === 'web_push' && currentEnabled) {
      setPushSubscriptionState('idle');
      setPushError(null);
    }

    updateMutation.mutate({
      pacienteId,
      channel,
      enabled: !currentEnabled,
    });
  };

  const handleRetry = async () => {
    setPushError(null);
    setPushSubscriptionState('pending');
    const result = await requestPushSubscription();
    if (!result.ok) {
      if (result.reason === 'ios-not-standalone') {
        setPushError('En iPhone, las notificaciones push solo funcionan si la app está instalada en tu pantalla de inicio.');
      } else {
        setPushError(mapSubscriptionErrorToSpanish(result.reason));
      }
      setPushSubscriptionState('failed');
      return;
    }
    setPushSubscriptionState('subscribed');
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
  const webPushEnabled = isEnabled('web_push') || pushSubscriptionState === 'subscribed';
  const isPending = pushSubscriptionState === 'pending';

  // Alert behavior preferences from the web_push settings row
  const webPushSetting = settings?.find((s) => s.channel === 'web_push');
  const alertPrefs = {
    require_interaction: webPushSetting?.require_interaction ?? true,
    vibrate: webPushSetting?.vibrate ?? true,
    renotify: webPushSetting?.renotify ?? true,
    badge: webPushSetting?.badge ?? true,
  };

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

      {/* Push error / retry banner */}
      {pushError && (
        <div
          style={{
            padding: '0.5rem 0.75rem',
            background: '#fef9c3',
            border: '1px solid #fde047',
            borderRadius: '6px',
            marginBottom: '0.75rem',
            fontSize: '0.85rem',
            color: '#854d0e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
          role="alert"
          aria-live="assertive"
        >
          <span>{pushError}</span>
          <button
            onClick={handleRetry}
            disabled={isPending}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.8rem',
              borderRadius: '4px',
              border: '1px solid #ca8a04',
              background: isPending ? '#e5e7eb' : '#fde047',
              color: isPending ? '#9ca3af' : '#854d0e',
              cursor: isPending ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {isPending ? 'Pendiente…' : 'Reintentar'}
          </button>
        </div>
      )}

      {/* Channel toggles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {channelDefs.map(({ key, label, alwaysAvailable, envKey }) => {
          const enabled = isEnabled(key);
          const envAvailable = alwaysAvailable || (envKey ? availableChannels[envKey] : false);
          const available = envAvailable;
          const isWebPush = key === 'web_push';
          // For web_push, show as checked when local state indicates user intent
          const isChecked = isWebPush
            ? enabled || pushSubscriptionState === 'subscribed' || pushSubscriptionState === 'failed' || pushSubscriptionState === 'pending'
            : enabled;

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
                checked={isChecked}
                onChange={() => handleToggle(key, enabled)}
                disabled={!available || updateMutation.isPending || (isWebPush && isPending)}
              />
              <span>{label}</span>
              {isWebPush && <PushSubscriptionBadge state={pushSubscriptionState} />}
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

      {/* Alert behavior sub-toggles — visible only when web_push is enabled */}
      {webPushEnabled && (
        <div style={{ marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
            Comportamiento de las notificaciones:
          </div>
          {[
            { field: 'require_interaction' as const, label: 'Mantener notificación en pantalla' },
            { field: 'vibrate' as const, label: 'Vibrar al recibir' },
            { field: 'renotify' as const, label: 'Volver a alertar si ya hay una igual' },
            { field: 'badge' as const, label: 'Mostrar ícono en la barra' },
          ].map(({ field, label }) => (
            <label key={field} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={alertPrefs[field]}
                onChange={() => updateMutation.mutate({ pacienteId, channel: 'web_push', field, value: !alertPrefs[field] })}
                disabled={updateMutation.isPending}
              />
              <span>{label}</span>
            </label>
          ))}
          <p style={{ fontSize: '0.75rem', color: '#888', margin: '0.25rem 0 0' }}>
            En iPhone algunas opciones pueden no funcionar (vibrar, ícono en barra).
          </p>
        </div>
      )}

      {/* Device list — shown when web_push is enabled */}
      {webPushEnabled && <DeviceList />}
    </div>
  );
}

/** Inline badge showing push subscription state next to the web_push label. */
function PushSubscriptionBadge({ state }: { state: PushSubscriptionState }) {
  if (state === 'idle') return null;

  const dotColor = state === 'subscribed' ? '#16a34a' : state === 'failed' ? '#eab308' : '#9ca3af';
  const text = state === 'subscribed' ? 'Push activo' : state === 'failed' ? 'Push no configurado' : 'Pendiente…';

  return (
    <span
      aria-live="polite"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        fontSize: '0.75rem',
        color: dotColor,
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: dotColor,
          display: 'inline-block',
        }}
      />
      {text}
    </span>
  );
}
