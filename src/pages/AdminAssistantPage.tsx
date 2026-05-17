import { SectionTitle } from "../components/common/SectionTitle";
import { ChatComposer } from "../components/chat/ChatComposer";
import { ChatMessageBubble } from "../components/chat/ChatMessageBubble";
import { SuggestedPrompts } from "../components/chat/SuggestedPrompts";
import { useStore } from "../context/StoreContext";


const adminQuickPrompts = [
  "What should we promote this week?",
  "What should we stock up on?",
  "When are our busiest times?",
];

export function AdminAssistantPage() {
  const store = useStore();
  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Admin AI Assistant"
        title="Decision support for managers"
        description="Use quick prompts or chat directly for promotions, stock planning, and staffing timing."
      />

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="card-surface p-5">
          <h3 className="text-base font-semibold text-slate-900">Quick prompts</h3>
          <div className="mt-4">
            <SuggestedPrompts prompts={adminQuickPrompts} onSelect={store.sendAdminMessage} />
          </div>

          <div className="mt-4 rounded-2xl bg-cafe-50 p-4 text-xs text-cafe-800">
            Uses live inventory + map zone counts with mock sales curves for hackathon-safe decision support.
          </div>
        </div>

        <div className="card-surface p-5">
          <h3 className="text-base font-semibold text-slate-900">Manager chat</h3>
          <p className="mt-1 text-sm text-slate-600">
            Ask follow-up questions naturally, just like the operations assistant.
          </p>

          <div className="mt-4 flex max-h-[28rem] flex-col gap-3 overflow-y-auto rounded-3xl bg-slate-50 p-4">
            {store.adminMessages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}
          </div>

          <ChatComposer onSend={store.sendAdminMessage} />
        </div>
      </div>
    </div>
  );
}
