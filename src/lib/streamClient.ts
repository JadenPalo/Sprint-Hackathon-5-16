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

  const tokenResponse = await requestStreamToken(user);
  if (!tokenResponse?.token) {
    return null;
  }

  if (connectedUserId) {
    await streamClient.disconnectUser();
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

  connectedUserId = user.id;
  return streamClient;
}

export async function disconnectStreamUser() {
  if (!client || !connectedUserId) {
    return;
  }

  await client.disconnectUser();
  connectedUserId = null;
}
