interface TogglePillProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  enabledLabel: string;
  disabledLabel: string;
}

export function TogglePill({
  checked,
  onChange,
  enabledLabel,
  disabledLabel,
}: TogglePillProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`inline-flex items-center gap-3 rounded-full px-2 py-2 text-sm font-medium transition ${
        checked ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
      }`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
          checked ? "bg-emerald-500 text-white" : "bg-slate-500 text-white"
        }`}
      >
        {checked ? "ON" : "OFF"}
      </span>
      <span>{checked ? enabledLabel : disabledLabel}</span>
    </button>
  );
}
