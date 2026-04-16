"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
};

const SEEN_KEY = "skillhub_seen_notifications";

function getSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function markAllSeen(ids: string[]) {
  try {
    const existing = getSeenIds();
    ids.forEach((id) => existing.add(id));
    // Keep only last 200 IDs to avoid bloat
    const arr = Array.from(existing).slice(-200);
    localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

export function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unseenCount, setUnseenCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: NotificationItem[]) => {
        setItems(data);
        const seen = getSeenIds();
        setUnseenCount(data.filter((item) => !seen.has(item.id)).length);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggleOpen() {
    if (!open) {
      // Mark all as seen when opening
      markAllSeen(items.map((i) => i.id));
      setUnseenCount(0);
    }
    setOpen((prev) => !prev);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggleOpen}
        aria-label="Уведомления"
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unseenCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--accent)] px-0.5 text-[10px] font-bold text-black">
            {unseenCount > 9 ? "9+" : unseenCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-black/10 bg-white shadow-xl">
          <div className="border-b border-black/10 px-4 py-3">
            <p className="text-sm font-semibold text-black">Уведомления</p>
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[var(--muted)]">
              Пока нет уведомлений
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-black/5">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block px-4 py-3 hover:bg-[var(--surface-muted)]"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                          item.type === "hw_pending" || item.type === "test_needs_review"
                            ? "bg-[var(--accent)]"
                            : "bg-emerald-400"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-black">
                          {item.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
