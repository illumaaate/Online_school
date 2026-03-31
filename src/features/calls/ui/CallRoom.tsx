import { ExcalidrawBoard } from "@/features/whiteboard/ui/ExcalidrawBoard";
import { CallVideoRoom } from "@/features/calls/ui/CallVideoRoom";
import { CallChat } from "@/features/calls/ui/CallChat";

export function CallRoom({ callId }: { callId: string }) {
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <CallVideoRoom callId={callId} />
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-zinc-700">Онлайн-доска</h2>
        <ExcalidrawBoard
          callId={callId}
          className="w-full"
          canvasHeightClassName="h-[680px]"
        />
      </div>

      <CallChat callId={callId} />
    </section>
  );
}
