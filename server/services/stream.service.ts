import { StreamChat } from "stream-chat";

export interface StreamUserInput {
  id: string;
  name: string;
  role: string;
}

export interface ZoneChannelInput {
  zoneId: string;
  zoneName: string;
  memberIds: string[];
  createdBy: StreamUserInput;
}

export interface ZoneMessageInput {
  zoneId: string;
  text: string;
  createdBy: StreamUserInput;
  attachments?: Array<Record<string, unknown>>;
}

const apiKey = process.env.STREAM_API_KEY ?? "78m9fxacyzvc";
const apiSecret = process.env.STREAM_API_SECRET ?? "9qbhtdm9pu2vf8ymjj9frdjx5752r3y4kqv86xtutb2zdfg8v8p5jsu5mm32t58k";

if (!apiKey || !apiSecret) {
  // Keep runtime error explicit and server-side only.
  throw new Error("Missing STREAM_API_KEY or STREAM_API_SECRET.");
}

const serverClient = StreamChat.getInstance(apiKey, apiSecret);

export function createUserToken(userId: string) {
  return serverClient.createToken(userId);
}

export async function upsertStreamUser(user: StreamUserInput) {
  await serverClient.upsertUser({
    id: user.id,
    name: user.name,
    role: user.role,
  });
}

export async function upsertZoneChannel(input: ZoneChannelInput) {
  await upsertStreamUser(input.createdBy);

  const uniqueMembers = Array.from(new Set([input.createdBy.id, ...input.memberIds]));
  const channel = serverClient.channel("team", input.zoneId, {
    name: input.zoneName,
    members: uniqueMembers,
    created_by_id: input.createdBy.id,
  });

  await channel.create();
  await channel.addMembers(uniqueMembers);

  return channel;
}

export async function sendZoneSystemMessage(input: ZoneMessageInput) {
  await upsertStreamUser(input.createdBy);
  const channel = serverClient.channel("team", input.zoneId);
  await channel.watch();

  await channel.sendMessage({
    text: input.text,
    user_id: input.createdBy.id,
    attachments: input.attachments,
  });
}
