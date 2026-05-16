export interface StreamConfig {
  apiKey: string;
  userId: string;
  userToken: string;
  enabled: boolean;
}

export function getStreamConfig(): StreamConfig {
  return {
    apiKey: import.meta.env.VITE_STREAM_API_KEY ?? "",
    userId: import.meta.env.VITE_STREAM_USER_ID ?? "",
    userToken: import.meta.env.VITE_STREAM_USER_TOKEN ?? "",
    enabled: import.meta.env.VITE_ENABLE_STREAM_CHAT === "true",
  };
}

export function hasUsableStreamConfig(config: StreamConfig): boolean {
  return Boolean(config.enabled && config.apiKey && config.userId && config.userToken);
}
