# Excalidraw Whiteboard - Code Reference

## ExcalidrawBoard Component

File: src/features/whiteboard/ui/ExcalidrawBoard.tsx (207 lines)

### Props
- lessonId?: string (for lessons)
- callId?: string (for calls)
- className?: string (CSS classes)
- canvasHeightClassName?: string (default: h-[560px])

### State
- initialData: Board state loaded from server
- ready: Excalidraw initialization flag
- apiRef: Reference to Excalidraw API
- lastSyncAtRef: Last server state timestamp
- lastSavedAtRef: Tracks save debounce (2200ms min)
- lastLocalWriteAtRef: Tracks sync debounce (2500ms min)

### Initialization Flow
1. Mount -> GET /api/{calls|lessons}/{id}/board
2. Parse response, normalize collaborators
3. Set initialData
4. When Excalidraw ready, start polling

### Save Flow (onChange)
1. User draws/edits
2. Check: if (now - lastSavedAtRef) < 2200ms, skip
3. Create boardState object with empty collaborators
4. POST to API
5. Update lastLocalWriteAtRef and lastSyncAtRef

### Sync Flow (Polling every 3s)
1. Skip if: (now - lastLocalWriteAtRef) < 2500ms
2. GET latest state from server
3. Skip if: updatedAt hasn't changed
4. Normalize state
5. Call updateScene() to update Excalidraw

### Functions
- normalizeBoardState(boardState): Converts collaborators to Map
- safeJson<T>(response): Safe JSON parse

---

## Call Board API

File: src/app/api/calls/[id]/board/route.ts (98 lines)

### GET /api/calls/{callId}/board
Returns: { boardState: Json | null, updatedAt: string | null }

Process:
1. Verify session user
2. Validate user is teacher or student in call
3. Query BoardDocument by (teacherId, studentId)
4. Return boardState and updatedAt

### POST /api/calls/{callId}/board
Body: { boardState?: unknown }
Returns: BoardDocument record

Process:
1. Verify session user
2. Validate user in call
3. UPSERT BoardDocument on (teacherId, studentId)
4. Store full Excalidraw state as JSON
5. updatedAt auto-set by Prisma
6. Return record

### Data Model: BoardDocument
- One per teacher-student pair
- Stores full Excalidraw state
- Composite unique key: (teacherId, studentId)
- Timestamps: createdAt, updatedAt

---

## Lesson Board API

File: src/app/api/lessons/[id]/board/route.ts (27 lines)

### GET /api/lessons/{lessonId}/board
Returns: { boardState: Json | null, updatedAt: string | null }

Process:
1. Verify session user
2. Query LessonRoom by lessonId
3. Return boardState and updatedAt (null if not found)

### POST /api/lessons/{lessonId}/board
Body: { boardState?: unknown }
Returns: LessonRoom record

Process:
1. Verify session user
2. UPSERT LessonRoom by lessonId
3. Create if new, update if exists
4. Store boardState as JSON
5. Return record with updatedAt

### Data Model: LessonRoom
- One per lesson
- Shared by all lesson participants
- Unique key: lessonId
- Has updatedAt timestamp

### Security Note
Minimal auth - only checks user exists, no lesson membership validation

---

## Database Models

### BoardDocument (calls)
```
id: cuid (primary key)
teacherId: string (FK to User)
studentId: string (FK to User)
boardState: Json (nullable)
updatedAt: DateTime (auto-managed)
createdAt: DateTime (default now)

Unique constraint: (teacherId, studentId)
Relations: teacher (User), student (User)
```

### LessonRoom (lessons)
```
id: cuid (primary key)
lessonId: string (unique FK to Lesson)
boardState: Json (nullable)
updatedAt: DateTime (auto-managed)

Unique constraint: lessonId
Relation: lesson (Lesson)
```

---

## Integration

### LessonRoom Component
src/features/lesson/ui/LessonRoom.tsx
<ExcalidrawBoard lessonId={lessonId} />
- Shared whiteboard for lesson
- Displayed with video and chat
- Default: h-[560px]

### CallRoom Component
src/features/calls/ui/CallRoom.tsx
<ExcalidrawBoard
  callId={callId}
  className="!rounded-none !border-0"
  canvasHeightClassName="h-[600px]"
/>
- One-on-one whiteboard
- 600px height
- Below video and chat

---

## Timing

Save debounce: 2200ms (min time between saves)
Sync debounce: 2500ms (min time since write before syncing)
Polling interval: 3000ms (check server every 3s)

Example timeline:
t=0ms: User draws
t=1000ms: Still drawing (debounced)
t=2200ms+: Can save again
t=2300ms: Save POSTed to server
t=2500ms+: Can sync again
t=3000ms: Poll, but skip if write too recent
t=5000ms+: Poll, sync if server has updates
