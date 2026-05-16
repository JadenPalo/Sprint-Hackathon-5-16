interface MetricCardProps {
  label: string;
  value: string | number;
  tone?: "neutral" | "healthy" | "low" | "critical";
  helper?: string;
}

const toneMap = {
  neutral: "bg-slate-50 text-slate-700",
  healthy: "bg-emerald-50 text-emerald-700",
  low: "bg-amber-50 text-amber-700",
  critical: "bg-rose-50 text-rose-700",
};

export function MetricCard({
  label,
  value,
  tone = "neutral",
  helper,
}: MetricCardProps) {
  return (
    <div className="card-surface p-5">
      <div className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${toneMap[tone]}`}>
        {label}
      </div>
      <p className="mt-4 text-3xl font-semibold text-slate-900">{value}</p>
      {helper ? <p className="mt-2 text-sm text-slate-500">{helper}</p> : null}
    </div>
  );
}
