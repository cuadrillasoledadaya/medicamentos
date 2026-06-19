// Zustand store for the active paciente context.
// Persisted to localStorage so it survives page reloads.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ActivePacienteState {
  activePacienteId: string | null;
  setActivePaciente: (id: string | null) => void;
}

export const useActivePaciente = create<ActivePacienteState>()(
  persist(
    (set) => ({
      activePacienteId: null,
      setActivePaciente: (id) => set({ activePacienteId: id }),
    }),
    { name: 'active-paciente' },
  ),
);
