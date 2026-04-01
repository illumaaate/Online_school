import { ExcalidrawBoard } from "@/features/whiteboard/ui/ExcalidrawBoard";
import { CallVideoRoom } from "@/features/calls/ui/CallVideoRoom";
import { CallChat } from "@/features/calls/ui/CallChat";

export function CallRoom({ callId, topic }: { callId: string; topic: string }) {
  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">{topic}</h1>

      <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <CallVideoRoom callId={callId} />
        <CallChat callId={callId} />
      </div>

      <div className="skillhub-panel overflow-hidden rounded-xl">
        <ExcalidrawBoard
          callId={callId}
          className="!rounded-none !border-0"
          canvasHeightClassName="h-[600px]"
        />
      </div>
    </div>
  );
}
