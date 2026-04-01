# Excalidraw Whiteboard Feature - Complete Analysis

## Files Found

### 1. Component
- **src/features/whiteboard/ui/ExcalidrawBoard.tsx** (207 lines)

### 2. API Routes  
- **src/app/api/calls/[id]/board/route.ts** (98 lines)
- **src/app/api/lessons/[id]/board/route.ts** (27 lines)

### 3. Integration
- **src/features/calls/ui/CallRoom.tsx** - Uses ExcalidrawBoard with callId
- **src/features/lesson/ui/LessonRoom.tsx** - Uses ExcalidrawBoard with lessonId
- **src/app/lesson/[id]/page.tsx** - Renders LessonRoom

### 4. Database (prisma/schema.prisma)
- **BoardDocument** model - For call sessions
- **LessonRoom** model - For lesson rooms

---

## 1. ExcalidrawBoard Component

**Location:** src/features/whiteboard/ui/ExcalidrawBoard.tsx

**Key Features:**
- Dynamically imported (no SSR)
- Supports two modes: lessonId OR callId
- Auto-saves every 2.2+ seconds
- Polls server every 3 seconds for updates
- Debounces saves/syncs to prevent race conditions

**State Tracking:**
```
- initialData: Board state from server
- ready: Whether Excalidraw is initialized
- apiRef: Reference to Excalidraw API
- lastSyncAtRef: Last timestamp from server
- lastSavedAtRef: Debounce save timing (2200ms min)
- lastLocalWriteAtRef: Track write time for sync debounce (2500ms min)
```

**Core Functions:**
1. `normalizeBoardState()` - Handles Map/Array/Object conversion for collaborators
2. `safeJson()` - Safe JSON parsing
3. `onChange()` - Debounced save handler
4. Polling interval - 3s sync check

**Flow:**
1. Mount → GET board state
2. User edits → onChange → debounce 2.2s → POST
3. Poll every 3s → GET → compare updatedAt → updateScene()

---

## 2. Call Session Board API

**Route:** src/app/api/calls/[id]/board/route.ts

**Authentication:** Requires session user who is teacher or student in call

**GET Request:**
```
Returns: {
  boardState: Json | null,
  updatedAt: string | null
}

Logic:
- Fetch call session
- Validate user is teacher or student
- Fetch BoardDocument by (teacherId, studentId) composite key
```

**POST Request:**
```
Body: { boardState?: unknown }
Returns: BoardDocument record with updated timestamp

Logic:
- Validate authorization
- UPSERT BoardDocument on (teacherId, studentId)
- Store full Excalidraw state as JSON
```

**Data Model:** BoardDocument
- One board per teacher-student pair
- Stores: elements, appState, files
- Composite unique key: (teacherId, studentId)

---

## 3. Lesson Board API

**Route:** src/app/api/lessons/[id]/board/route.ts

**Authentication:** Only requires session user (minimal validation)

**GET Request:**
```
Returns: {
  boardState: Json | null,
  updatedAt: string | null
}

Logic:
- Fetch LessonRoom by lessonId
- Return boardState or null
```

**POST Request:**
```
Body: { boardState?: unknown }
Returns: LessonRoom record

Logic:
- UPSERT LessonRoom by lessonId
- Create if doesn't exist
- Update boardState
```

**Data Model:** LessonRoom
- One board per lesson (shared by all participants)
- Stores: elements, appState, files
- Unique key: lessonId

---

## 4. Database Schema

### BoardDocument (for calls)
```prisma
model BoardDocument {
  id         String   @id @default(cuid())
  teacherId  String
  studentId  String
  boardState Json?
  updatedAt  DateTime @updatedAt
  createdAt  DateTime @default(now())
  teacher    User     @relation("BoardTeacher")
  student    User     @relation("BoardStudent")
  
  @@unique([teacherId, studentId])
}
```

### LessonRoom (for lessons)
```prisma
model LessonRoom {
  id         String   @id @default(cuid())
  lessonId   String   @unique
  boardState Json?
  updatedAt  DateTime @updatedAt
  lesson     Lesson   @relation
}
```

---

## 5. Integration Points

### In LessonRoom Component
```typescript
<ExcalidrawBoard 
  lessonId={lessonId}
/>
```
- Shared whiteboard for entire lesson
- Displayed in grid with LiveKitRoom and chat
- Used in lesson pages

### In CallRoom Component  
```typescript
<ExcalidrawBoard
  callId={callId}
  className="!rounded-none !border-0"
  canvasHeightClassName="h-[600px]"
/>
```
- One-on-one whiteboard for teacher-student call
- 600px height
- Displayed below video and chat

---

## 6. Persistence & Sync Logic

### Initialization
1. Component mounts with lessonId or callId
2. Makes GET request to API endpoint
3. Loads previous board state or starts blank
4. Sets up polling interval when ready

### Saving (Local → Server)
1. User draws/edits → onChange fires
2. Checks 2200ms debounce timer
3. Creates boardState object:
   ```
   {
     elements,
     appState: { ...appState, collaborators: [] },
     files
   }
   ```
4. POSTs to API
5. Backend UPSERTs to database
6. Tracks lastLocalWriteAtRef for sync debounce

### Syncing (Server → Local)  
1. Every 3 seconds, polls GET endpoint
2. Skips if local write was < 2500ms ago
3. Compares updatedAt timestamp
4. If changed, normalizes remote state
5. Updates Excalidraw scene via updateScene()

### Debouncing Strategy
- Save debounce: 2200ms minimum between saves
- Sync debounce: 2500ms (skip polling if local write recent)
- Polling interval: 3000ms
- Prevents race conditions and excessive requests

---

## 7. Key Characteristics

**Real-time Behavior:**
- Optimistic updates (changes appear immediately)
- Polling-based (not WebSocket)
- 3 second latency for seeing others' changes
- Last-write-wins (no conflict resolution)

**Collaborative:**
- Multiple users can access same board
- No presence indicators or cursors
- Concurrent edits may lose data
- No OT/CRDT implementation

**Persistence:**
- Full state stored as JSON
- Auto-saved to database
- Survives page reloads
- Per-call or per-lesson

---

## 8. Type Safety Issues

1. **Lesson POST Route:** Casts boardState as `object` without validation
2. **Inconsistent Prisma JSON:** Uses `Prisma.JsonNull` in one route, plain `as object` in other
3. **No Type Validation:** boardState can contain any JSON value

---

## 9. Security Notes

**Call Sessions:**
- Properly validates user is participant (teacher or student)
- Isolated per teacher-student pair
- One BoardDocument per call relationship

**Lesson Rooms:**
- Only checks session user exists
- Does NOT validate lesson membership
- Shared board for entire lesson (any logged-in user could access)

---

## 10. File Structure

```
src/
├── features/
│   ├── whiteboard/
│   │   └── ui/
│   │       └── ExcalidrawBoard.tsx (component)
│   ├── calls/
│   │   └── ui/
│   │       └── CallRoom.tsx (uses ExcalidrawBoard)
│   └── lesson/
│       └── ui/
│           └── LessonRoom.tsx (uses ExcalidrawBoard)
└── app/
    ├── api/
    │   ├── calls/
    │   │   └── [id]/board/route.ts (GET/POST)
    │   └── lessons/
    │       └── [id]/board/route.ts (GET/POST)
    └── lesson/
        └── [id]/page.tsx (renders LessonRoom)

prisma/
└── schema.prisma (BoardDocument, LessonRoom models)
```
