'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginAction } from '@/lib/auth/actions';
import { loginSchema, type LoginSchema } from '@/lib/auth/schemas';
import { FormShell } from '@/components/auth/form-shell';

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);

    startTransition(async () => {
      const result = await loginAction(values);

      if (result.status === 'error') {
        setFormError(result.message ?? 'No pudimos iniciar sesión.');

        Object.entries(result.fieldErrors ?? {}).forEach(([key, message]) => {
          form.setError(key as keyof LoginSchema, { message });
        });

        return;
      }

      router.push(result.redirectTo ?? '/login');
      router.refresh();
    });
  });

  return (
    <FormShell
      eyebrow="Acceso"
      title="Entrá a Karaí"
      description="Usá tu email y contraseña para ingresar al dashboard."
      footer={
        <>
          ¿Todavía no tenés cuenta?{' '}
          <Link className="text-emerald-300" href="/signup">
            Crear cuenta
          </Link>
        </>
      }
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            className="w-full rounded-2xl border border-white/10 bg-zinc-800/50 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500"
            placeholder="tu@email.com"
            {...form.register('email')}
          />
          {form.formState.errors.email ? (
            <p className="mt-2 text-sm text-rose-300">{form.formState.errors.email.message}</p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="login-password">
            Contraseña
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            className="w-full rounded-2xl border border-white/10 bg-zinc-800/50 px-4 py-3 text-white outline-none ring-0 placeholder:text-slate-500"
            placeholder="••••••••"
            {...form.register('password')}
          />
          {form.formState.errors.password ? (
            <p className="mt-2 text-sm text-rose-300">{form.formState.errors.password.message}</p>
          ) : null}
        </div>

        {formError ? <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{formError}</p> : null}

        <button
          className="w-full rounded-full bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isPending}
          type="submit"
        >
          {isPending ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </FormShell>
  );
}
