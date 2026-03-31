"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LiveKitRoom as Room,
  VideoConference,
} from "@livekit/components-react";

type TokenResponse = {
  token: string;
  wsUrl: string;
  roomName?: string;
};

function buildHints(errorText: string) {
  const text = errorText.toLowerCase();
  const hints = [
    "Проверьте, что звонок открыт тем же пользователем (teacher/student), для которого он создан.",
    "Убедитесь, что в `.env` указаны `NEXT_PUBLIC_LIVEKIT_WS_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`.",
    "После изменения `.env` обязательно перезапустите `npm run dev`.",
  ];

  if (text.includes("forbidden") || text.includes("403")) {
    return [
      "У текущего пользователя нет доступа к этому звонку.",
      "Войдите под нужным аккаунтом (преподаватель или назначенный студент).",
    ];
  }

  if (text.includes("unauthorized") || text.includes("401")) {
    return [
      "Сессия истекла. Выполните вход заново и откройте страницу еще раз.",
    ];
  }

  if (
    text.includes("livekit") ||
    text.includes("token") ||
    text.includes("ws")
  ) {
    return [
      "Похоже, проблема в конфигурации LiveKit или выдаче токена.",
      ...hints,
    ];
  }

  return hints;
}

export function CallVideoRoom({ callId }: { callId: string }) {
  const [data, setData] = useState<TokenResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retryTick, setRetryTick] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");

  const loadToken = useCallback(async () => {
    setLoading(true);
    setError("");
    setData(null);

    try {
      const res = await fetch(`/api/calls/${callId}/livekit-token`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          payload.error ?? `Token request failed (${res.status})`,
        );
      }

      const payload = (await res.json()) as TokenResponse;
      if (!payload.token || !payload.wsUrl) {
        throw new Error("Некорректный ответ сервера токена");
      }

      setData(payload);
      setConnectionStatus("connecting");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось подключить видеозвонок",
      );
      setConnectionStatus("disconnected");
    } finally {
      setLoading(false);
    }
  }, [callId]);

  useEffect(() => {
    void loadToken();
  }, [loadToken, retryTick]);

  const hintList = useMemo(() => buildHints(error), [error]);

  if (loading) {
    return (
      <div className="w-full">
        <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
          <span>Видеозвонок</span>
          <span>Подключение…</span>
        </div>
        <div className="flex h-[420px] w-full items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-100 text-sm text-zinc-600 md:h-[520px]">
          Подготавливаем комнату LiveKit...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full">
        <div className="mb-2 text-xs text-zinc-500">Видеозвонок</div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">
            Не удалось подключить видео
          </p>
          <p className="mt-1 text-sm text-red-600">
            {error || "Неизвестная ошибка"}
          </p>

          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-red-700/90">
            {hintList.map((hint) => (
              <li key={hint}>{hint}</li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setRetryTick((prev) => prev + 1)}
            className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white"
          >
            Повторить подключение
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
        <span>Видеозвонок</span>
        <span>
          {connectionStatus === "connected"
            ? "Connected"
            : connectionStatus === "connecting"
              ? "Connecting"
              : "Disconnected"}
        </span>
      </div>

      <div className="w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-900 p-2">
        <div className="h-[420px] w-full md:h-[520px] lg:h-[620px]">
          <Room
            token={data.token}
            serverUrl={data.wsUrl}
            connect
            video
            audio
            onConnected={() => setConnectionStatus("connected")}
            onDisconnected={() => setConnectionStatus("disconnected")}
            onError={(roomError) => setError(roomError.message)}
          >
            <VideoConference />
          </Room>
        </div>
      </div>
    </div>
  );
}
