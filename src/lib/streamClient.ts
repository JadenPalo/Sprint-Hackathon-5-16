import { StreamChat } from "stream-chat";
import { getStreamConfig, hasUsableStreamConfig } from "./stream";
import { requestStreamToken } from "./streamApi";

export interface StreamUserIdentity {
  id: string;
  name: string;
  role: string;
}

let client: StreamChat | null = null;
let connectedUserId: string | null = null;
let connectionSequence = 0;

export function getStreamClient(): StreamChat | null {
  const config = getStreamConfig();
  if (!hasUsableStreamConfig(config)) {
    return null;
  }

  if (!client) {
    client = StreamChat.getInstance(config.apiKey);
  }

  return client;
}

export async function connectStreamUser(user: StreamUserIdentity): Promise<StreamChat | null> {
  const streamClient = getStreamClient();
  if (!streamClient) {
    return null;
  }

  if (connectedUserId === user.id) {
    return streamClient;
  }

  const sequence = ++connectionSequence;
  const tokenResponse = await requestStreamToken(user);
  if (!tokenResponse?.token || sequence !== connectionSequence) {
    return null;
  }

  if (connectedUserId) {
    await streamClient.disconnectUser();
    if (sequence !== connectionSequence) {
      return null;
    }
    connectedUserId = null;
  }

  await streamClient.connectUser(
    {
      id: user.id,
      name: user.name,
      role: user.role,
    },
    tokenResponse.token
  );

  if (sequence !== connectionSequence) {
    await streamClient.disconnectUser();
    connectedUserId = null;
    return null;
  }

  connectedUserId = user.id;
  return streamClient;
}

export async function disconnectStreamUser() {
  connectionSequence += 1;

  if (!client || !connectedUserId) {
    return;
  }

  await client.disconnectUser();
  connectedUserId = null;
}
