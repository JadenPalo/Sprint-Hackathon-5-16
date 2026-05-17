import { useEffect, useMemo, useState } from "react";
import type { Channel, Event } from "stream-chat";
import { getStreamClient } from "../../lib/streamClient";
import { ensureZoneChannel } from "../../lib/streamApi";
import type { EmployeeResponsibility, Zone } from "../../types/inventory";

interface ZoneChatPanelProps {
  zone: Zone;
  currentUser: { id: string; name: string; role: string } | null;
  employees: EmployeeResponsibility[];
  isAdmin: boolean;
}

interface ZoneMessage {
  id: string;
  text: string;
  userName: string;
  createdAt: string;
}

export function ZoneChatPanel({ zone, currentUser, employees, isAdmin }: ZoneChatPanelProps) {
  const [messages, setMessages] = useState<ZoneMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [channel, setChannel] = useState<Channel | null>(null);

  const memberIds = useMemo(() => {
    const assigned = employees
      .filter((employee) => employee.assignedZoneIds.includes(zone.id))
      .map((employee) => employee.id);

    if (isAdmin && currentUser?.id) {
      return Array.from(new Set([...assigned, currentUser.id]));
    }

    return assigned;
  }, [employees, isAdmin, currentUser?.id, zone.id]);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    async function bootstrap() {
      if (!currentUser) {
        return;
      }

      await ensureZoneChannel({
        zoneId: zone.id,
        zoneName: zone.name,
        memberIds,
        createdBy: currentUser,
      });

      const client = getStreamClient();
      if (!client) {
        return;
      }

      const zoneChannel = client.channel("team", zone.id);
      await zoneChannel.watch();

      if (!mounted) {
        return;
      }

      setChannel(zoneChannel);

      const nextMessages =
        zoneChannel.state.messages?.slice(-40).map((message) => ({
          id: message.id,
          text: message.text ?? "",
          userName: message.user?.name ?? message.user?.id ?? "Unknown",
          createdAt: message.created_at
            ? new Date(message.created_at).toISOString()
            : new Date().toISOString(),
        })) ?? [];

      setMessages(nextMessages);

      const onEvent = (event: Event) => {
        if (event.type !== "message.new" || !event.message) {
          return;
        }

        setMessages((current) => [
          ...current,
          {
            id: event.message?.id ?? crypto.randomUUID(),
            text: event.message?.text ?? "",
            userName: event.user?.name ?? event.user?.id ?? "Unknown",
            createdAt: event.message?.created_at ?? new Date().toISOString(),
          },
        ]);
      };

      zoneChannel.on(onEvent);
      unsubscribe = () => zoneChannel.off(onEvent);
    }

    bootstrap();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser, memberIds, zone.id, zone.name]);

  async function sendMessage() {
    const text = draft.trim();
    if (!text || !channel) {
      return;
    }

    await channel.sendMessage({ text });
    setDraft("");
  }

  return (
    <div className="card-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-600">Zone chat</h4>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
          {zone.name}
        </span>
      </div>

      <div className="mt-3 max-h-56 space-y-2 overflow-auto">
        {messages.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
            No messages yet. Start the zone discussion.
          </p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{message.userName}</p>
              <p className="text-sm text-slate-800">{message.text || "—"}</p>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Message this zone..."
          className="soft-ring min-w-0 flex-1 rounded-xl border-0 bg-slate-50 px-3 py-2 text-sm outline-none"
        />
        <button
          type="button"
          onClick={sendMessage}
          disabled={!currentUser}
          className="rounded-xl bg-cafe-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
