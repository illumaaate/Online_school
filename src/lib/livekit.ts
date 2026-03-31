import { AccessToken } from "livekit-server-sdk";

export function getLivekitWsUrl() {
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_WS_URL?.trim();

  if (!wsUrl) {
    throw new Error("NEXT_PUBLIC_LIVEKIT_WS_URL is not configured");
  }

  return wsUrl;
}

export async function createLivekitToken(params: {
  room: string;
  identity: string;
  name: string;
}): Promise<string> {
  getLivekitWsUrl();

  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();

  if (!apiKey || !apiSecret) {
    throw new Error("LIVEKIT_API_KEY / LIVEKIT_API_SECRET are not configured");
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: params.identity,
    name: params.name,
  });

  token.addGrant({
    room: params.room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  const jwt = await token.toJwt();

  if (!jwt || typeof jwt !== "string") {
    throw new Error("Failed to generate LiveKit JWT");
  }

  return jwt;
}
