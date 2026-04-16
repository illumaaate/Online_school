"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TestsEditor } from "./TestsEditor";

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: "FILE" | "IMAGE";
  size: number;
}

interface Props {
  unitId: string;
  initialTitle: string;
  initialDescription: string | null;
  initialContent: string | null;
  initialVideoUrl: string | null;
}

const fieldClass =
  "w-full rounded-2xl border border-black/10 bg-[var(--surface-muted)] px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UnitEditor({
  unitId,
  initialTitle,
  initialDescription,
  initialContent,
  initialVideoUrl,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [content, setContent] = useState(initialContent ?? "");
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl ?? "");

  const contentRef = useRef<HTMLTextAreaElement>(null);

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/units/${unitId}/attachments`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setAttachments(data); })
      .catch(() => null);
  }, [open, unitId]);

  function insertAtCursor(text: string) {
    const ta = contentRef.current;
    if (!ta) {
      setContent((prev) => prev + "\n" + text);
      return;
    }
    const start = ta.selectionStart ?? content.length;
    const end = ta.selectionEnd ?? content.length;
    const before = content.slice(0, start);
    const after = content.slice(end);
    const prefix = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
    const suffix = after.length > 0 && !after.startsWith("\n") ? "\n" : "";
    const next = before + prefix + text + suffix + after;
    setContent(next);
    // restore cursor after inserted text
    requestAnimationFrame(() => {
      const pos = start + prefix.length + text.length + suffix.length;
      ta.setSelectionRange(pos, pos);
      ta.focus();
    });
  }

  async function uploadFile(
    file: File,
    kind: "image" | "file",
  ): Promise<Attachment | null> {
    const fd = new FormData();
    fd.append("file", file);
    const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      setUploadError((err as { error?: string }).error ?? "Ошибка загрузки.");
      return null;
    }
    const uploaded = await uploadRes.json() as {
      url: string; name: string; size: number; type: "FILE" | "IMAGE";
    };
    // Force type based on which button was used
    const finalType = kind === "image" ? "IMAGE" : "FILE";
    const saveRes = await fetch(`/api/units/${unitId}/attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...uploaded, type: finalType }),
    });
    if (!saveRes.ok) {
      setUploadError("Не удалось сохранить вложение.");
      return null;
    }
    return saveRes.json() as Promise<Attachment>;
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadError(null);
    setUploadingImage(true);
    for (const file of files) {
      const att = await uploadFile(file, "image");
      if (!att) break;
      setAttachments((prev) => [...prev, att]);
      // Insert markdown image at cursor
      insertAtCursor(`![${att.name}](${att.url})`);
    }
    setUploadingImage(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploadError(null);
    setUploadingFile(true);
    for (const file of files) {
      const att = await uploadFile(file, "file");
      if (!att) break;
      setAttachments((prev) => [...prev, att]);
    }
    setUploadingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleInsertImage(att: Attachment) {
    insertAtCursor(`![${att.name}](${att.url})`);
  }

  async function removeAttachment(id: string) {
    const res = await fetch(`/api/units/${unitId}/attachments/${id}`, { method: "DELETE" });
    if (res.ok) setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  async function save() {
    if (!title.trim()) {
      setStatus({ ok: false, msg: "Название не может быть пустым." });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const [unitRes, matRes] = await Promise.all([
        fetch(`/api/units/${unitId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), description: description.trim() || null }),
        }),
        fetch(`/api/units/${unitId}/material`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: content.trim() || null, videoUrl: videoUrl.trim() || null }),
        }),
      ]);
      if (!unitRes.ok || !matRes.ok) {
        setStatus({ ok: false, msg: "Не удалось сохранить изменения." });
        return;
      }
      setStatus({ ok: true, msg: "Сохранено." });
      router.refresh();
    } catch {
      setStatus({ ok: false, msg: "Сетевая ошибка." });
    } finally {
      setSaving(false);
    }
  }

  async function deleteUnit() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/units/${unitId}`, { method: "DELETE" });
      if (res.ok) {
        router.back();
      } else {
        setStatus({ ok: false, msg: "Не удалось удалить занятие." });
        setConfirmDelete(false);
      }
    } catch {
      setStatus({ ok: false, msg: "Сетевая ошибка при удалении." });
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  const fileAttachments = attachments.filter((a) => a.type === "FILE");
  const imageAttachments = attachments.filter((a) => a.type === "IMAGE");

  return (
    <article className="skillhub-panel rounded-[1.75rem] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <span className="text-lg font-semibold text-black">Редактировать урок</span>
        <svg
          className={`h-5 w-5 text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-black/10 px-6 pb-6 pt-5 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted)]">Название урока</label>
            <input
              className={fieldClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название урока"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted)]">Описание (необязательно)</label>
            <textarea
              className={`${fieldClass} resize-none`}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Краткое описание урока..."
            />
          </div>

          {/* Text content + image insertion */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--muted)]">Текстовый материал</label>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-black/10 px-2.5 py-1 text-xs text-[var(--muted)] hover:border-[var(--accent)] hover:text-black">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4-4 4 4 4-8 4 8M4 20h16a2 2 0 002-2V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {uploadingImage ? "Загрузка..." : "Вставить картинку"}
                <input
                  ref={imageInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept="image/*"
                  disabled={uploadingImage}
                  onChange={handleImageChange}
                />
              </label>
            </div>
            <textarea
              ref={contentRef}
              className={`${fieldClass} resize-y font-mono text-xs`}
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Введите текст урока, конспект, задание..."
            />
            <p className="text-[11px] text-[var(--muted)]">
              Поддерживается Markdown. Кнопка «Вставить картинку» загружает файл и вставляет его на позицию курсора.
            </p>
          </div>

          {/* Uploaded images list */}
          {imageAttachments.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-[var(--muted)]">Загруженные картинки</p>
              <ul className="space-y-2">
                {imageAttachments.map((att) => (
                  <li
                    key={att.id}
                    className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--surface-muted)] px-3 py-2"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={att.url}
                      alt={att.name}
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                    />
                    <span className="flex-1 truncate text-sm text-black">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => handleInsertImage(att)}
                      className="shrink-0 rounded-xl border border-black/10 px-2.5 py-1 text-xs text-[var(--muted)] hover:border-[var(--accent)] hover:text-black"
                    >
                      Вставить в текст
                    </button>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="shrink-0 rounded-lg p-1 text-[var(--muted)] hover:text-red-500"
                      title="Удалить"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--muted)]">Ссылка на видео</label>
            <input
              className={fieldClass}
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="YouTube URL или прямая ссылка на видеофайл"
            />
            <p className="text-[11px] text-[var(--muted)]">
              Поддерживаются ссылки YouTube (youtu.be, youtube.com/watch) и прямые ссылки .mp4, .webm
            </p>
          </div>

          {/* File attachments (documents) */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--muted)]">Файлы для скачивания</label>

            {fileAttachments.length > 0 && (
              <ul className="space-y-2">
                {fileAttachments.map((att) => (
                  <li
                    key={att.id}
                    className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--surface-muted)] px-4 py-2.5"
                  >
                    <svg className="h-4 w-4 shrink-0 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5l5 5v14a2 2 0 01-2 2z" />
                    </svg>
                    <span className="flex-1 truncate text-sm text-black">{att.name}</span>
                    <span className="shrink-0 text-xs text-[var(--muted)]">{formatSize(att.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="ml-1 shrink-0 rounded-lg p-1 text-[var(--muted)] hover:text-red-500"
                      title="Удалить"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-black/20 px-4 py-3 hover:border-[var(--accent)] hover:bg-[var(--surface-muted)]">
              <svg className="h-5 w-5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm text-[var(--muted)]">
                {uploadingFile ? "Загрузка..." : "Добавить файл для скачивания"}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                disabled={uploadingFile}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                onChange={handleFileChange}
              />
            </label>
            {uploadError && (
              <p className="text-sm text-red-500">{uploadError}</p>
            )}
            <p className="text-[11px] text-[var(--muted)]">
              PDF, Word, Excel, PowerPoint, TXT, ZIP — до 50 МБ
            </p>
          </div>

          <div className="border-t border-black/10 pt-4">
            <TestsEditor unitId={unitId} />
          </div>

          {status && (
            <p className={`text-sm font-medium ${status.ok ? "text-green-600" : "text-red-500"}`}>
              {status.msg}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="skillhub-button-primary rounded-2xl px-5 py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {saving ? "Сохранение..." : "Сохранить изменения"}
            </button>

            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100"
              >
                Удалить урок
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600">Удалить безвозвратно?</span>
                <button
                  type="button"
                  onClick={deleteUnit}
                  disabled={deleting}
                  className="rounded-2xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60"
                >
                  {deleting ? "Удаляем..." : "Да, удалить"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-2xl border border-black/10 px-4 py-2 text-sm text-[var(--muted)] hover:text-black"
                >
                  Отмена
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
