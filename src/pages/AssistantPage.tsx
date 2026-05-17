import { demoPrompts } from "../data/demoPrompts";
import { useStore } from "../context/StoreContext";
import { getStreamConfig, hasUsableStreamConfig } from "../lib/stream";
import { ChatWindow } from "../components/chat/ChatWindow";
import { SectionTitle } from "../components/common/SectionTitle";

export function AssistantPage() {
  const store = useStore();
  const streamConfig = getStreamConfig();
  const streamReady = hasUsableStreamConfig(streamConfig);

  return (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="Assistant"
        title="Natural-language inventory help"
        description="Ask what is low, log usage in plain English, and keep staff aligned during busy shifts."
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <ChatWindow
          messages={store.messages}
          prompts={demoPrompts}
          onSend={store.sendMessage}
        />

        <div className="space-y-4">
          <div className="card-surface p-5">
            <h3 className="text-lg font-semibold text-slate-900">Gemini provider status</h3>
            <p className="mt-2 text-sm text-slate-600">
              The assistant is optimized for Gemini reasoning while keeping deterministic inventory commands for safe updates.
            </p>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <p>
                <span className="font-semibold">Provider mode:</span>{" "}
                {import.meta.env.VITE_AI_PROVIDER?.toLowerCase() === "gemini"
                  ? "Gemini enabled"
                  : "Fallback parser mode"}
              </p>
              <p className="mt-2">
                Set <code>VITE_AI_PROVIDER=gemini</code> and <code>VITE_GEMINI_API_KEY</code> in frontend env.
              </p>
            </div>
          </div>

          <div className="card-surface p-5">
            <h3 className="text-lg font-semibold text-slate-900">Suggested demo moments</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>• Ask which items are low or critical.</li>
              <li>• Restock oat milk using plain English.</li>
              <li>• Log cup usage while offline.</li>
              <li>• Return online and show the sync state recover.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
