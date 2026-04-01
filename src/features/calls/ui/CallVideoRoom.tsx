"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  LiveKitRoom as Room,
  useTracks,
  ControlBar,
  RoomAudioRenderer,
} from "@livekit/components-react";
import { Track } from "livekit-client";

type TokenResponse = { token: string; wsUrl: string };

function buildHint(errorText: string) {
  const t = errorText.toLowerCase();
  if (t.includes("forbidden") || t.includes("403")) return "Нет доступа к этому звонку.";
  if (t.includes("unauthorized") || t.includes("401")) return "Сессия истекла — войдите заново.";
  return "Проверьте LIVEKIT_* в .env и перезапустите сервер.";
}


// Рендерит один видеотайл через прямой вызов track.attach() — никаких LiveKit стилей
function VideoTile({ trackRef, isLocal, name, solo }: {
  trackRef: { publication?: { track?: { attach: (el: HTMLVideoElement) => void; detach: (el: HTMLVideoElement) => void; sid?: string } } };
  isLocal: boolean;
  name: string;
  solo?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    const track = trackRef.publication?.track;
    if (!el || !track) return;
    track.attach(el);
    return () => { track.detach(el); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackRef.publication?.track?.sid]);

  return (
    <div style={{
      position: "relative",
      flex: solo ? "none" : 1,
      width: solo ? "auto" : undefined,
      height: "100%",
      aspectRatio: solo ? "16 / 9" : undefined,
      maxWidth: "100%",
      minWidth: 0,
      overflow: "hidden",
      borderRadius: 8,
      background: "#27272a",
    }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        style={{
          position: "absolute",
          top: 0, left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
      <span style={{
        position: "absolute",
        bottom: 4, left: 6,
        fontSize: 10,
        color: "#fff",
        background: "rgba(0,0,0,0.6)",
        padding: "1px 6px",
        borderRadius: 4,
      }}>
        {name}
      </span>
    </div>
  );
}

function VideoArea() {
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: false }],
    { onlySubscribed: false },
  );

  if (tracks.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 12, color: "#71717a" }}>Камера выключена</span>
      </div>
    );
  }

  const solo = tracks.length === 1;

  return (
    <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
      <div style={{
        position: "absolute", inset: 4,
        display: "flex", gap: 4, overflow: "hidden",
        justifyContent: solo ? "center" : undefined,
      }}>
        {tracks.map((t) => (
          <VideoTile
            key={t.participant.identity}
            trackRef={t as Parameters<typeof VideoTile>[0]["trackRef"]}
            isLocal={t.participant.isLocal}
            name={t.participant.name ?? t.participant.identity}
            solo={solo}
          />
        ))}
      </div>
    </div>
  );
}

export function CallVideoRoom({ callId }: { callId: string }) {
  const [data, setData] = useState<TokenResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retryTick, setRetryTick] = useState(0);
  const [connected, setConnected] = useState(false);

  const loadToken = useCallback(async () => {
    setLoading(true); setError(""); setData(null);
    try {
      const res = await fetch(`/api/calls/${callId}/livekit-token`, { cache: "no-store" });
      if (!res.ok) {
        const p = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(p.error ?? `HTTP ${res.status}`);
      }
      const p = (await res.json()) as TokenResponse;
      if (!p.token || !p.wsUrl) throw new Error("Некорректный ответ сервера");
      setData(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }, [callId]);

  useEffect(() => { void loadToken(); }, [loadToken, retryTick]);
  const hint = useMemo(() => buildHint(error), [error]);

  if (loading) {
    return (
      <div className="flex h-16 items-center gap-3 rounded-xl border border-[var(--border)] bg-zinc-900 px-4">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
        <span className="text-sm text-zinc-400">Подключение…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-red-700">{error || "Ошибка"}</p>
          <p className="text-xs text-red-500 mt-0.5">{hint}</p>
        </div>
        <button onClick={() => setRetryTick((n) => n + 1)} className="skillhub-button-primary shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium">
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div style={{
      height: 320,
      borderRadius: 12,
      overflow: "hidden",
      background: "#18181b",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Статус */}
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "6px 10px",
        fontSize: 11,
        color: connected ? "#4ade80" : "#fbbf24",
        flexShrink: 0,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: connected ? "#4ade80" : "#fbbf24", flexShrink: 0 }} />
        {connected ? "В сети" : "Подключение…"}
      </div>

      <Room
        token={data.token}
        serverUrl={data.wsUrl}
        connect
        audio
        video
        options={{ dynacast: true, adaptiveStream: true }}
        onConnected={() => setConnected(true)}
        onDisconnected={() => setConnected(false)}
        onError={(e) => setError(e.message)}
        style={{ flex: 1, minHeight: 0, height: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        <RoomAudioRenderer />
        <VideoArea />
        <ControlBar
          controls={{ screenShare: false, chat: false, settings: false }}
          style={{ flexShrink: 0, background: "rgba(0,0,0,0.3)", borderTop: "1px solid rgba(255,255,255,0.08)", padding: "5px 8px", gap: 6 }}
        />
      </Room>
    </div>
  );
}
