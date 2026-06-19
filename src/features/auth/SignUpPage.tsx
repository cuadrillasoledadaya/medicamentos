// Sign-up page with email/password + confirmation.

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useSignUp } from './hooks';

const signUpSchema = z
  .object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type SignUpForm = z.infer<typeof signUpSchema>;

export function SignUpPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpForm>({
    resolver: zodResolver(signUpSchema),
  });

  const signUp = useSignUp();

  const onSubmit = (data: SignUpForm) => {
    signUp.mutate({ email: data.email, password: data.password });
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
      <h1 style={{ marginBottom: '1.5rem' }}>Crear cuenta</h1>

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

        <div>
          <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 'bold' }}>
            Confirmar contraseña
          </label>
          <input
            id="confirmPassword"
            type="password"
            {...register('confirmPassword')}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
          />
          {errors.confirmPassword && (
            <p style={{ color: 'red', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {signUp.error && (
          <p style={{ color: 'red', fontSize: '0.85rem' }}>
            Error: {signUp.error.message}
          </p>
        )}

        {signUp.isSuccess && (
          <p style={{ color: 'green', fontSize: '0.85rem' }}>
            Cuenta creada. Revisá tu email para confirmar.
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
          {isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>

      <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
        ¿Ya tenés cuenta?{' '}
        <Link to="/auth/sign-in" style={{ color: '#0ea5e9' }}>
          Iniciar sesión
        </Link>
      </p>
    </div>
  );
}

export default SignUpPage;
