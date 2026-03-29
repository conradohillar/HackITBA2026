type FormShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function FormShell({ eyebrow, title, description, children, footer }: FormShellProps) {
  return (
    <div className="marketing-panel rounded-[2rem] p-6 backdrop-blur">
      <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold text-white">{title}</h2>
      {description ? <p className="mt-2 text-base leading-7 text-slate-300">{description}</p> : null}
      <div className="mt-5">{children}</div>
      {footer ? <div className="mt-4 text-sm text-slate-400">{footer}</div> : null}
    </div>
  );
}
