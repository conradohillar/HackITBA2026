import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div className="space-y-5">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Foundation &amp; Auth</p>
        <h2 className="text-4xl font-semibold text-white md:text-5xl">
          Volvé al flujo correcto según tu rol.
        </h2>
        <p className="max-w-2xl text-lg leading-8 text-slate-300">
          Cedentes e inversores comparten el mismo acceso base, pero después cada uno aterriza en
          su dashboard dedicado para continuar el happy path del demo.
        </p>
      </div>

      <LoginForm />
    </section>
  );
}
