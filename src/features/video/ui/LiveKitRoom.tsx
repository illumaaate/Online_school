"use client";

import { useEffect, useState } from "react";
import { LiveKitRoom as Room, VideoConference } from "@livekit/components-react";

type TokenResponse = {
  token: string;
  wsUrl: string;
};

export function LiveKitRoom({ lessonId }: { lessonId: string }) {
  const [data, setData] = useState<TokenResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    fetch(`/api/lessons/${lessonId}/livekit-token`)
      .then(async (res) => {
        if (!res.ok) {
          const payload = (await res.json()) as { error?: string };
          throw new Error(payload.error ?? "Failed token request");
        }
        return res.json() as Promise<TokenResponse>;
      })
      .then((payload) => {
        if (mounted) setData(payload);
      })
      .catch((e: Error) => {
        if (mounted) setError(e.message);
      });

    return () => {
      mounted = false;
    };
  }, [lessonId]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-zinc-600">Подключаем видео...</p>;

  return (
    <div className="xl:col-span-1">
      <div className="mb-2 text-xs text-zinc-500">Видеоурок (если статус Disconnected, проверь контейнер livekit)</div>
      <div className="h-[360px] overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-900 p-2">
        <Room token={data.token} serverUrl={data.wsUrl} connect video audio>
          <VideoConference />
        </Room>
      </div>
    </div>
  );
}
