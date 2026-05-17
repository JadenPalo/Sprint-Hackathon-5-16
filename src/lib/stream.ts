export interface StreamConfig {
  apiKey: string;
  enabled: boolean;
  apiBaseUrl: string;
}

export function getStreamConfig(): StreamConfig {
  return {
    apiKey: import.meta.env.VITE_STREAM_API_KEY ?? "",
    enabled: import.meta.env.VITE_ENABLE_STREAM_CHAT === "true",
    apiBaseUrl: import.meta.env.VITE_STREAM_API_BASE_URL ?? "/api/stream",
  };
}

export function hasUsableStreamConfig(config: StreamConfig): boolean {
  return Boolean(config.enabled && config.apiKey);
}
