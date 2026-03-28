import type { AuthRole } from '@/lib/auth/types';

type DashboardHeroProps = {
  role: AuthRole;
  title: string;
  description: string;
  displayName?: string | null;
  companyName?: string | null;
  children?: React.ReactNode;
};

export function DashboardHero({ role, title, description, displayName, companyName, children }: DashboardHeroProps) {
  const styles =
    role === 'cedente'
      ? {
          wrapper: 'border-emerald-300/20 bg-[radial-gradient(circle_at_top_left,rgba(110,231,183,0.22),transparent_35%),linear-gradient(180deg,rgba(8,24,18,0.95),rgba(9,17,15,0.82))]',
          text: 'text-emerald-300',
        }
      : {
          wrapper: 'border-sky-300/20 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.2),transparent_35%),linear-gradient(180deg,rgba(7,19,27,0.95),rgba(8,13,20,0.82))]',
          text: 'text-sky-300',
        };

  return (
    <div className={`rounded-[2rem] border p-8 shadow-2xl shadow-black/20 ${styles.wrapper}`}>
      <p className={`text-sm uppercase tracking-[0.3em] ${styles.text}`}>{role} dashboard</p>
      <h2 className="mt-4 text-4xl font-semibold text-white">{title}</h2>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">{description}</p>
      <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-200">
        {displayName ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">{displayName}</span> : null}
        {companyName ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">{companyName}</span> : null}
      </div>
      {children ? <div className="mt-8">{children}</div> : null}
    </div>
  );
}
