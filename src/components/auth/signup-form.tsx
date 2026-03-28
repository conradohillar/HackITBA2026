'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupAction } from '@/lib/auth/actions';
import { signupSchema, type SignupSchema } from '@/lib/auth/schemas';
import { FormShell } from '@/components/auth/form-shell';
import { authRoles } from '@/lib/auth/types';

const roleLabels = {
  cedente: 'Cedente · PyME que sube facturas',
  inversor: 'Inversor · Compra fracciones con retorno fijo',
} as const;

export function SignupForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<SignupSchema>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      role: 'cedente',
      displayName: '',
      companyName: '',
    },
  });

  const selectedRole = form.watch('role');

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await signupAction(values);

      if (result.status === 'error') {
        setFormError(result.message ?? 'No pudimos crear tu cuenta.');

        Object.entries(result.fieldErrors ?? {}).forEach(([key, message]) => {
          form.setError(key as keyof SignupSchema, { message });
        });

        return;
      }

      router.push(result.redirectTo ?? '/signup');
      router.refresh();
    });
  });

  return (
    <FormShell
      eyebrow="Registro"
      title="Creá tu cuenta y entrá al dashboard correcto"
      description="Para el demo, la cuenta queda lista al instante: elegís tu rol, confirmamos el perfil en el servidor y te llevamos directo al flujo adecuado."
      footer={
        <>
          ¿Ya tenés cuenta?{' '}
          <Link className="text-emerald-300" href="/login">
            Iniciar sesión
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="signup-email">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            placeholder="fundador@empresa.com"
            {...form.register('email')}
          />
          {form.formState.errors.email ? (
            <p className="mt-2 text-sm text-rose-300">{form.formState.errors.email.message}</p>
          ) : null}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="signup-display-name">
              Nombre visible
            </label>
            <input
              id="signup-display-name"
              type="text"
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              placeholder="María Pérez"
              {...form.register('displayName')}
            />
            {form.formState.errors.displayName ? (
              <p className="mt-2 text-sm text-rose-300">{form.formState.errors.displayName.message}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="signup-company-name">
              Empresa (opcional)
            </label>
            <input
              id="signup-company-name"
              type="text"
              className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500"
              placeholder="Acme SA"
              {...form.register('companyName')}
            />
            {form.formState.errors.companyName ? (
              <p className="mt-2 text-sm text-rose-300">{form.formState.errors.companyName.message}</p>
            ) : null}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="signup-password">
            Contraseña
          </label>
          <input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            placeholder="Mínimo 8 caracteres"
            {...form.register('password')}
          />
          {form.formState.errors.password ? (
            <p className="mt-2 text-sm text-rose-300">{form.formState.errors.password.message}</p>
          ) : null}
        </div>

        <fieldset>
          <legend className="mb-3 block text-sm font-medium text-slate-200">Elegí tu rol</legend>
          <div className="grid gap-3 md:grid-cols-2">
            {authRoles.map((role) => {
              const active = selectedRole === role;

              return (
                <label
                  key={role}
                  className={`cursor-pointer rounded-2xl border px-4 py-4 transition ${
                    active
                      ? 'border-emerald-300 bg-emerald-400/10 text-white'
                      : 'border-white/10 bg-slate-900 text-slate-300'
                  }`}
                >
                  <input className="sr-only" type="radio" value={role} {...form.register('role')} />
                  <span className="block text-sm font-semibold">{roleLabels[role]}</span>
                </label>
              );
            })}
          </div>
          {form.formState.errors.role ? (
            <p className="mt-2 text-sm text-rose-300">{form.formState.errors.role.message}</p>
          ) : null}
        </fieldset>

        {formError ? <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{formError}</p> : null}

        <button
          className="w-full rounded-full bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isPending}
          type="submit"
        >
          {isPending ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>
    </FormShell>
  );
}
