import { SignupForm } from '@/components/auth/signup-form';

export default function SignupPage() {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
      <div className="space-y-6">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">Phase 1</p>
        <h2 className="text-4xl font-semibold text-white md:text-5xl">
          Elegí tu rol y entrá directo al dashboard correcto.
        </h2>
        <p className="max-w-2xl text-lg leading-8 text-slate-300">
          El demo prioriza un alta inmediata. El servidor confirma la cuenta, persiste el perfil en
          Supabase y abre la sesión sin pedir pasos extra al usuario.
        </p>
      </div>

      <SignupForm />
    </section>
  );
}
