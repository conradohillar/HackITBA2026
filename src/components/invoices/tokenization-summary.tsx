type TokenizationSummaryProps = {
  autoPublishedToFunding: boolean;
  tokenHash: string;
  netAmount: number;
  totalFractions: number;
};

export function TokenizationSummary({ autoPublishedToFunding, tokenHash, netAmount, totalFractions }: TokenizationSummaryProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/50 p-6">
      <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Tokenización</p>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Card label="Token hash" value={tokenHash.slice(0, 18)} />
        <Card label="Monto neto" value={`ARS ${netAmount.toLocaleString('es-AR')}`} />
        <Card label="Fracciones" value={String(totalFractions)} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <StatusChip label="Tokenizada automáticamente" active={true} />
        <StatusChip label="Publicada en funding" active={autoPublishedToFunding} />
      </div>
      <p className="mt-4 text-sm text-slate-300">
        La misma originación dejó la factura lista para funding sin pasos manuales adicionales.
      </p>
    </section>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 break-all text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function StatusChip({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Estado</p>
      <p className="mt-2 text-lg font-semibold text-white">{label}</p>
      <p className="mt-1 text-sm text-slate-300">{active ? 'Confirmado en artefactos persistidos.' : 'Pendiente de publicacion.'}</p>
    </div>
  );
}
