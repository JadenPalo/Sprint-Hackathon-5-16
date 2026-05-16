import { demoPrompts } from "../data/demoPrompts";
import type { AppStore } from "../hooks/useAppState";
import { getStreamConfig, hasUsableStreamConfig } from "../lib/stream";
import { ChatWindow } from "../components/chat/ChatWindow";
import { SectionTitle } from "../components/common/SectionTitle";

interface AssistantPageProps {
  store: AppStore;
}

export function AssistantPage({ store }: AssistantPageProps) {
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
            <h3 className="text-lg font-semibold text-slate-900">GetStream track relevance</h3>
            <p className="mt-2 text-sm text-slate-600">
              This assistant is structured as a GetStream-ready chat experience, so you can plug in Stream credentials when available and keep the same UX layer.
            </p>
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              <p>
                <span className="font-semibold">SDK status:</span>{" "}
                {streamReady ? "Configured for live integration." : "Using local demo mode."}
              </p>
              <p className="mt-2">
                Add your Stream API key, user ID, and user token in <code>.env</code> to connect the UI to the real chat SDK.
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
