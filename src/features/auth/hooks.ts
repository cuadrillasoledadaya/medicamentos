// React Query hooks for auth operations.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { signInWithEmail, signUpWithEmail, signInWithGoogle, signOut, getCurrentUser } from './api';
import { clearAllCaches } from '../../lib/idb';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'currentUser'],
    queryFn: getCurrentUser,
    staleTime: Infinity, // auth state changes via onAuthStateChange, not polling
  });
}

export function useSignIn() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signInWithEmail(email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      navigate('/', { replace: true });
    },
  });
}

export function useSignUp() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signUpWithEmail(email, password),
    onSuccess: () => {
      // After signup, user needs to confirm email; redirect to sign-in
      navigate('/auth/sign-in', { replace: true });
    },
  });
}

export function useSignOut() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signOut,
    onSuccess: async () => {
      queryClient.clear();
      await clearAllCaches();
      navigate('/auth/sign-in', { replace: true });
    },
  });
}

export function useSignInWithGoogle() {
  return useMutation({
    mutationFn: signInWithGoogle,
  });
}
