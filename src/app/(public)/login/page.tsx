import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-20">
      <div className="space-y-5">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Acceso a la plataforma</p>
        <h2 className="text-5xl font-semibold text-white md:text-6xl">
          Iniciá sesión y retomá tus operaciones donde las dejaste.
        </h2>
      </div>

      <LoginForm />
    </section>
  );
}
