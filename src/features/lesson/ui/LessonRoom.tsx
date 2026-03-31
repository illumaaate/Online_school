import { LiveKitRoom } from "@/features/video/ui/LiveKitRoom";
import { ExcalidrawBoard } from "@/features/whiteboard/ui/ExcalidrawBoard";
import { LessonChat } from "@/features/chat/ui/LessonChat";

export function LessonRoom({ lessonId }: { lessonId: string }) {
  return (
    <section className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-3">
        <LiveKitRoom lessonId={lessonId} />
        <ExcalidrawBoard lessonId={lessonId} />
      </div>
      <LessonChat lessonId={lessonId} />
    </section>
  );
}
