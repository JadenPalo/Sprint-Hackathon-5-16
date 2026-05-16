import { formatTimestamp } from "../../lib/dates";
import type { ChatMessage } from "../../types/chat";

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const mine = message.role === "user";

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-3xl px-4 py-3 shadow-sm ${
          mine
            ? "rounded-br-md bg-slate-900 text-white"
            : "rounded-bl-md bg-white text-slate-900"
        }`}
      >
        <p className="text-sm leading-6">{message.text}</p>
        <p className={`mt-2 text-[11px] ${mine ? "text-slate-300" : "text-slate-500"}`}>
          {formatTimestamp(message.timestamp)}
        </p>
      </div>
    </div>
  );
}
