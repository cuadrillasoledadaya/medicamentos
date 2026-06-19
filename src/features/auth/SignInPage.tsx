// Sign-in page with email/password and Google OAuth.

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useSignIn, useSignInWithGoogle } from './hooks';

const signInSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type SignInForm = z.infer<typeof signInSchema>;

export function SignInPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
  });

  const signIn = useSignIn();
  const signInGoogle = useSignInWithGoogle();

  const onSubmit = (data: SignInForm) => {
    signIn.mutate(data);
  };

  return (
    <div
      style={{
        maxWidth: '400px',
        margin: '4rem auto',
        padding: '2rem',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
      }}
    >
      <h1 style={{ marginBottom: '1.5rem' }}>Iniciar sesión</h1>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            {...register('email')}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          {errors.email && (
            <p style={{ color: 'red', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            {...register('password')}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          {errors.password && (
            <p style={{ color: 'red', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>{errors.password.message}</p>
          )}
        </div>

        {signIn.error && (
          <p style={{ color: 'red', fontSize: '0.85rem' }}>
            Error: {signIn.error.message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: '0.75rem',
            background: '#0ea5e9',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
          }}
        >
          {isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>
      </form>

      <div style={{ margin: '1rem 0', textAlign: 'center', color: '#888' }}>o</div>

      <button
        onClick={() => signInGoogle.mutate()}
        disabled={signInGoogle.isPending}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: '#fff',
          color: '#333',
          border: '1px solid #ccc',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '1rem',
        }}
      >
        Continuar con Google
      </button>

      <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
        ¿No tenés cuenta?{' '}
        <Link to="/auth/sign-up" style={{ color: '#0ea5e9' }}>
          Crear cuenta
        </Link>
      </p>
    </div>
  );
}

export default SignInPage;
