import { getStreamConfig, hasUsableStreamConfig } from "./stream";

interface StreamUserPayload {
  id: string;
  name: string;
  role: string;
}

interface ZoneChannelPayload {
  zoneId: string;
  zoneName: string;
  memberIds: string[];
  createdBy: StreamUserPayload;
}

interface ZoneMessagePayload {
  zoneId: string;
  text: string;
  createdBy: StreamUserPayload;
  attachments?: Array<Record<string, unknown>>;
}

async function postJson<TResponse>(path: string, body: unknown): Promise<TResponse | null> {
  const config = getStreamConfig();
  if (!hasUsableStreamConfig(config)) {
    return null;
  }

  try {
    const response = await fetch(`${config.apiBaseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as TResponse;
  } catch {
    return null;
  }
}

export async function requestStreamToken(user: StreamUserPayload) {
  return postJson<{ token: string }>("/token", user);
}

export async function ensureZoneChannel(payload: ZoneChannelPayload) {
  return postJson<{ ok: true }>("/channels/zone", payload);
}

export async function postZoneSystemMessage(payload: ZoneMessagePayload) {
  return postJson<{ ok: true }>(`/channels/${payload.zoneId}/system-message`, payload);
}

export async function postInventoryAttachmentEvent(
  payload: ZoneMessagePayload & { itemId: string; itemName: string; quantity: number; unit: string }
) {
  return postJson<{ ok: true }>(`/channels/${payload.zoneId}/inventory-event`, payload);
}
