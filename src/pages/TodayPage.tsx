// TodayPage — deep-link landing page for push notifications.
// Renders TodayList with optional tomaId highlight.
// On iOS, shows IntakeActionModal when ?tomaId= is present without ?action=.
// When ?action= is present, useNotificationDeepLinkAction fires the mutation.

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TodayList } from '@/features/tomas/TodayList';
import { useActivePaciente } from '@/stores/activePaciente';
import { useNotificationDeepLinkAction } from '@/hooks/useNotificationDeepLinkAction';
import { IntakeActionModal } from '@/features/notifications/IntakeActionModal';
import { isIOS } from '@/features/notifications/scheduler';

export default function TodayPage() {
  const [searchParams] = useSearchParams();
  const tomaId = searchParams.get('tomaId') || undefined;
  const action = searchParams.get('action');
  const { activePacienteId } = useActivePaciente();
  const [modalOpen, setModalOpen] = useState(false);

  // Deep-link auto-trigger: fires mutation once when ?action= is present
  useNotificationDeepLinkAction();

  // iOS fallback: show modal when ?tomaId= present but no ?action=
  useEffect(() => {
    if (isIOS() && tomaId && !action) {
      setModalOpen(true);
    }
  }, [tomaId, action]);

  if (!activePacienteId) {
    return <p style={{ color: '#888' }}>No hay paciente seleccionado.</p>;
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Tomas de hoy</h2>
      <TodayList pacienteId={activePacienteId} highlightTomaId={tomaId} />
      {modalOpen && tomaId && (
        <IntakeActionModal tomaId={tomaId} open={modalOpen} onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '1rem', maxWidth: '600px', margin: '0 auto' },
  heading: { fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem' },
};
