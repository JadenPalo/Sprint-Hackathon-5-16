import { ChatComposer } from "./ChatComposer";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { SuggestedPrompts } from "./SuggestedPrompts";
import type { ChatMessage } from "../../types/chat";

interface ChatWindowProps {
  messages: ChatMessage[];
  prompts: string[];
  onSend: (text: string) => void;
}

export function ChatWindow({ messages, prompts, onSend }: ChatWindowProps) {
  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Operations assistant</h3>
          <p className="mt-1 text-sm text-slate-600">
            Friendly inventory help powered by a GetStream-ready chat experience.
          </p>
        </div>
        <div className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
          Chat UI ready
        </div>
      </div>

      <div className="mt-4">
        <SuggestedPrompts prompts={prompts} onSelect={onSend} />
      </div>

      <div className="mt-4 flex max-h-[28rem] flex-col gap-3 overflow-y-auto rounded-3xl bg-slate-50 p-4">
        {messages.map((message) => (
          <ChatMessageBubble key={message.id} message={message} />
        ))}
      </div>

      <ChatComposer onSend={onSend} />
    </div>
  );
}
