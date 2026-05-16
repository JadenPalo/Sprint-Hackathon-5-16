import { useState, type FormEvent } from "react";

interface ChatComposerProps {
  onSend: (text: string) => void;
}

export function ChatComposer({ onSend }: ChatComposerProps) {
  const [value, setValue] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!value.trim()) {
      return;
    }

    onSend(value);
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex gap-3">
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="soft-ring min-w-0 flex-1 rounded-2xl border-0 bg-slate-50 px-4 py-3 outline-none"
        placeholder="Ask inventory questions or log updates naturally..."
      />
      <button
        type="submit"
        className="rounded-2xl bg-cafe-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cafe-800"
      >
        Send
      </button>
    </form>
  );
}
