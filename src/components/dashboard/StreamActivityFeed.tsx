import { useEffect, useState } from "react";
import type { Channel } from "stream-chat";
import { getStreamClient } from "../../lib/streamClient";

interface StreamActivityFeedProps {
  enabled: boolean;
}

interface FeedEntry {
  id: string;
  text: string;
  channelName: string;
}

export function StreamActivityFeed({ enabled }: StreamActivityFeedProps) {
  const [entries, setEntries] = useState<FeedEntry[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadFeed() {
      if (!enabled) {
        return;
      }

      const client = getStreamClient();
      if (!client || !client.userID) {
        return;
      }

      const channels = await client.queryChannels(
        { type: "team", members: { $in: [client.userID] } },
        { last_message_at: -1 },
        { watch: false, state: true, limit: 10 }
      );

      if (!mounted) {
        return;
      }

      const next = channels
        .flatMap((channel: Channel) => {
          const last = channel.state.messages?.[channel.state.messages.length - 1];
          if (!last) {
            return [];
          }

          return [
            {
              id: `${channel.id}-${last.id}`,
              text: last.text ?? "",
              channelName: channel.data?.name ?? channel.id ?? "zone",
            },
          ];
        })
        .slice(0, 8);

      setEntries(next);
    }

    loadFeed();

    return () => {
      mounted = false;
    };
  }, [enabled]);

  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Team activity feed</h3>
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          {enabled ? "Live" : "Disabled"}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {!enabled ? (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
            Enable Stream chat to see live team activity.
          </p>
        ) : entries.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
            No channel activity yet.
          </p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{entry.channelName}</p>
              <p className="text-sm text-slate-800">{entry.text || "—"}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
