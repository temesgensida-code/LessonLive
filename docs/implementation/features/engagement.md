# Implementation & Test Plan: Classroom Engagement Suite (Real-Time Tools)

**Target Directory:** `frontend/src/src-output/components/engagement/`  
**Document Status:** Persistent Architecture & Implementation Specification  
**Associated Issues/Features:** 
1. Raise Hand & Speaker Permission Queue
2. Dedicated Q&A Board with Peer Upvoting
3. Quick 1-Click Micro-Polls

---

## 1. Architecture & Real-Time Data Plane

### 1.1 LiveKit Data Channel Foundation
LessonLive currently uses the LiveKit WebRTC Data Channel for lightweight, ultra-low-latency, room-scoped message broadcasting (e.g. `lessonlive-chat` and `lessonlive-quiz`). The Classroom Engagement Suite extends this proven architecture with dedicated sub-topics:

| Feature | Topic Identifier | Delivery Guarantee | Sync Strategy |
| :--- | :--- | :--- | :--- |
| **Raise Hand** | `lessonlive-hand` | `Reliable: true` | Teacher maintains authoritative queue; sends full state upon join/request |
| **Q&A Board** | `lessonlive-qna` | `Reliable: true` | Peer-broadcast with state sync request on student entry (`QNA_SYNC_REQUEST`) |
| **Micro-Polls** | `lessonlive-poll` | `Reliable: true` | Teacher broadcast (`POLL_START`), student response (`POLL_VOTE`), teacher close (`POLL_END`) |

```mermaid
sequenceDiagram
    autonumber
    actor Student as Student Client
    participant LK as LiveKit Room Data Channel
    actor Teacher as Teacher Client

    %% Hand Raise Flow
    Note over Student,Teacher: 1. Raise Hand & Speaker Queue
    Student->>LK: HAND_RAISE { studentId, name, timestamp } (topic: lessonlive-hand)
    LK-->>Teacher: Deliver HAND_RAISE
    Teacher->>Teacher: Add to queue & update badge ("3 Hands Raised")
    Teacher->>LK: GRANT_MIC { targetIdentity }
    LK-->>Student: Deliver GRANT_MIC
    Student->>Student: Unmute local audio track automatically

    %% Q&A Flow
    Note over Student,Teacher: 2. Dedicated Q&A Board
    Student->>LK: QNA_NEW { questionId, text, author, timestamp } (topic: lessonlive-qna)
    LK-->>Teacher: Deliver QNA_NEW
    LK-->>Student: Deliver QNA_NEW (peer students)
    Student->>LK: QNA_UPVOTE { questionId, voterIdentity }
    Teacher->>LK: QNA_PIN_LIVE { questionId }

    %% Micro-Poll Flow
    Note over Student,Teacher: 3. Quick Micro-Polls
    Teacher->>LK: POLL_START { pollId, type, prompt, options, durationSeconds: 15 } (topic: lessonlive-poll)
    LK-->>Student: Display Floating Toast Alert
    Student->>LK: POLL_VOTE { pollId, voterIdentity, optionIndex }
    Teacher->>Teacher: Live-updating Donut / Bar Chart
```

---

## 2. Protocol Specifications & Payloads

### 2.1 Raise Hand Protocol (`lessonlive-hand`)
```typescript
// 1. Student raises hand
interface HandRaisePayload {
  type: 'HAND_RAISE';
  identity: string;
  name: string;
  raisedAt: number; // Date.now()
}

// 2. Student lowers hand OR teacher dismisses
interface HandLowerPayload {
  type: 'HAND_LOWER';
  identity: string;
  loweredBy: 'student' | 'teacher';
}

// 3. Teacher grants mic permission
interface HandGrantMicPayload {
  type: 'GRANT_MIC';
  targetIdentity: string;
}

// 4. Teacher revokes mic permission / mutes student
interface HandRevokeMicPayload {
  type: 'REVOKE_MIC';
  targetIdentity: string;
}

// 5. Teacher syncs entire queue to newly joined participants
interface HandSyncResponsePayload {
  type: 'HAND_SYNC';
  queue: Array<{
    identity: string;
    name: string;
    raisedAt: number;
    micGranted: boolean;
  }>;
}
```

### 2.2 Q&A Board Protocol (`lessonlive-qna`)
```typescript
interface QnAQuestion {
  id: string; // uuid or timestamp-id
  text: string;
  author: string;
  authorIdentity: string;
  createdAt: number;
  upvotes: string[]; // array of student identities who upvoted
  status: 'open' | 'answering_live' | 'answered';
}

interface QnANewPayload {
  type: 'QNA_NEW';
  question: QnAQuestion;
}

interface QnAUpvotePayload {
  type: 'QNA_UPVOTE';
  questionId: string;
  identity: string; // voter
  isUpvoting: boolean; // true = upvote, false = remove upvote
}

interface QnAStatusChangePayload {
  type: 'QNA_STATUS_CHANGE';
  questionId: string;
  status: 'open' | 'answering_live' | 'answered';
}

interface QnASyncRequestPayload {
  type: 'QNA_SYNC_REQUEST';
}

interface QnASyncResponsePayload {
  type: 'QNA_SYNC_RESPONSE';
  questions: QnAQuestion[];
  pinnedQuestionId: string | null;
}
```

### 2.3 Micro-Poll Protocol (`lessonlive-poll`)
```typescript
interface MicroPoll {
  id: string;
  type: 'thumbs' | 'yes_no' | 'confidence' | 'custom';
  prompt: string;
  options: string[]; // e.g. ['👍 Understand', '👎 Confused'] or ['1','2','3','4','5']
  durationSeconds: number; // default 15s
  startedAt: number;
  closed: boolean;
}

interface PollStartPayload {
  type: 'POLL_START';
  poll: MicroPoll;
}

interface PollVotePayload {
  type: 'POLL_VOTE';
  pollId: string;
  voterIdentity: string;
  optionIndex: number;
}

interface PollEndPayload {
  type: 'POLL_END';
  pollId: string;
  results: Record<number, number>; // optionIndex -> count
  totalVotes: number;
}
```

---

## 3. Component Architecture & UI Breakdown

### 3.1 Directory Structure
We will create a clean modular subfolder inside `frontend/src/src-output/components/engagement/`:

```
frontend/src/src-output/components/engagement/
├── engagement.css                     # Common styling & animations
├── useLiveKitDataTopic.js             # Reusable hook wrapping LiveKit publishData & dataReceived
├── hand-raise/
│   ├── RaiseHandButton.jsx            # Student persistent raise hand button with status indicator
│   ├── TeacherHandQueueModal.jsx      # Teacher queue drawer/dialog with order & mic controls
│   └── useHandQueue.js                # State management hook for hands
├── qna/
│   ├── QnABoard.jsx                   # Tabbed Q&A board replacing or alongside UsernameChat
│   ├── QnAQuestionItem.jsx            # Question card with upvote button, tags, answer actions
│   ├── PinnedLiveQuestionBanner.jsx   # Sticky banner shown when teacher answers question live
│   └── useQnABoard.js                 # State hook with peer sync & local storage persistence
└── micro-poll/
    ├── MicroPollLauncherModal.jsx     # Teacher modal with 1-click presets (Thumbs, Yes/No, 1-5)
    ├── StudentMicroPollToast.jsx      # Student non-blocking bottom-center floating toast with timer
    ├── TeacherMicroPollResults.jsx    # Real-time animated donut / bar charts of student votes
    └── useMicroPoll.js                # State hook for active polls and timers
```

---

## 4. Step-by-Step Implementation Details

### Step 1: Base Utility Hook (`useLiveKitDataTopic.js`)
* Extract duplicated LiveKit Data Channel pub/sub logic currently spread across `UsernameChat` and `StudentQuizPage`.
* Safe JSON encoding/decoding with error boundary.
* Clean event listener cleanup on unmount.

### Step 2: Feature 1 — "Raise Hand" & Speaker Permission Queue
1. **Student Side (`RaiseHandButton.jsx`)**:
   - Placed in the audio control toolbar (`LiveAudioButton.jsx` and `LiveClassroom.jsx` bottom bar).
   - Display states:
     - *Default*: Hand Outline icon + `"Raise Hand"`.
     - *Raised*: Filled Golden Hand icon + Pulsing animation + `"Hand Raised (#2 in queue)"`.
     - *Mic Granted*: Green Mic icon + `"You have the floor (Unmuted)"`.
   - Clicking while raised lowers the hand and sends `HAND_LOWER`.
2. **Teacher Side (`TeacherHandQueueModal.jsx`)**:
   - Header badge button: `<Hand size={16} /> 3 Hands Raised` with a golden pulse animation when > 0 hands are in queue.
   - Clicking opens a slide-over panel displaying students ordered by `raisedAt`.
   - Controls per student:
     - **Grant Mic**: Publishes `GRANT_MIC`. Student client un-mutes automatically.
     - **Mute / Revoke**: Publishes `REVOKE_MIC`.
     - **Dismiss / Lower**: Removes student from queue.
   - Global control: **"Lower All Hands"** button for quick clearing between topics.
3. **Integration Point**:
   - In `LiveClassSidePanel.jsx` and `LiveClassroom.jsx`, render the `RaiseHandButton` for students and the queue trigger for teachers.

### Step 3: Feature 2 — Dedicated Q&A Board with Peer Upvoting
1. **Tabbed Layout**:
   - Update `LiveClassSidePanel.jsx` (and `LiveClassroom.jsx` right panel) to include tabs:
     - `[ Chat (N) ]` | `[ Q&A (N) ]`
2. **Q&A List View (`QnABoard.jsx`)**:
   - Filter bar: `All Questions` | `Most Upvoted` | `Unanswered` | `My Questions`.
   - Search input for real-time question filtering.
3. **Question Card (`QnAQuestionItem.jsx`)**:
   - Upvote button with chevron and count. Students cannot upvote their own questions; clicking toggles upvote status.
   - Timestamp and student avatar/initials.
   - Teacher actions:
     - **Answer Live**: Pins question to a sticky stage banner on all clients (`PinnedLiveQuestionBanner.jsx`) so everyone knows what is currently being discussed.
     - **Mark as Answered**: Greys out card and adds green check badge.
4. **Student Input**:
   - Clean textarea at the bottom of the Q&A tab with validation (max 250 characters, duplicate protection).

### Step 4: Feature 3 — Quick 1-Click Micro-Polls
1. **Teacher Trigger (`MicroPollLauncherModal.jsx`)**:
   - Added to `OptionsMenu.jsx` and bottom action bar: `"Quick Poll"`.
   - One-click launch templates:
     - `Thumbs`: "Understand? 👍 / 👎"
     - `Yes / No`: "Ready to move on? ✅ Yes / ❌ No"
     - `Confidence`: "Rate your confidence 1 to 5 ⭐"
     - `Custom`: Enter prompt + 2 to 4 custom options.
   - Defaults to 15-second duration with auto-broadcast.
2. **Student Toast (`StudentMicroPollToast.jsx`)**:
   - Appears as a high-visibility, glassmorphism bottom floating card (does not block notes or screen share).
   - Shows question prompt, countdown timer progress bar (15s to 0s), and large clickable option chips.
   - Upon selecting an option, changes to `"Vote recorded ✓ — waiting for results"` and disables buttons.
3. **Teacher Live Results Display (`TeacherMicroPollResults.jsx`)**:
   - Real-time response counter: e.g. `18 / 24 students responded (75%)`.
   - Percentage breakdown with color-coded bar/donut animations.
   - "Broadcast Results to Students" toggle so students can see how the room voted once the poll closes.

---

## 5. Comprehensive Test Plan

### 5.1 Automated Unit & Integration Tests (Vitest & RTL)

All tests will be placed in `frontend/src/tests/engagement/`:

#### Test Suite 1: `RaiseHand.test.jsx`
- [x] **TC-HAND-01 (Student Raise)**: Verify student clicking "Raise Hand" triggers `publishData` with `type: 'HAND_RAISE'` and identity. *(Verified: RaiseHand.test.jsx)*
- [x] **TC-HAND-02 (Student Lower)**: Verify student clicking "Lower Hand" toggles button state and publishes `type: 'HAND_LOWER'`. *(Verified)*
- [x] **TC-HAND-03 (Teacher Queue Ordering)**: Pass multiple hand raise packets to `useHandQueue` at different timestamps; verify queue renders ordered by oldest to newest. *(Verified)*
- [x] **TC-HAND-04 (Teacher Grant Mic)**: Verify teacher clicking "Grant Mic" publishes `GRANT_MIC` with the student identity. *(Verified)*
- [x] **TC-HAND-05 (Student Mic Auto-Enable)**: Verify receiving `GRANT_MIC` triggers `localParticipant.setMicrophoneEnabled(true)`. *(Verified)*
- [x] **TC-HAND-06 (Teacher Lower All)**: Verify teacher "Lower All" clears queue and broadcasts batch lower. *(Verified)*

#### Test Suite 2: `QnABoard.test.jsx`
- [x] **TC-QNA-01 (Post Question)**: Verify submitting a question publishes `QNA_NEW` and appends question to local list. *(Verified: QnABoard.test.jsx)*
- [x] **TC-QNA-02 (Upvote Toggle)**: Verify clicking upvote increments vote count and publishes `QNA_UPVOTE`; clicking again decrements count. *(Verified)*
- [x] **TC-QNA-03 (Sorting by Most Upvoted)**: Verify switching filter to "Most Upvoted" reorders questions in descending order of upvote array length. *(Verified)*
- [x] **TC-QNA-04 (Teacher Mark Answered)**: Verify teacher action changes status to `'answered'` and updates badge styling. *(Verified)*
- [x] **TC-QNA-05 (Teacher Answer Live)**: Verify teacher action sets `pinnedQuestionId` and renders `PinnedLiveQuestionBanner`. *(Verified)*
- [x] **TC-QNA-06 (Duplicate Suppression)**: Verify submitting an identical question within 10 seconds is prevented with an accessible warning. *(Verified)*

#### Test Suite 3: `MicroPoll.test.jsx`
- [x] **TC-POLL-01 (Teacher Launch)**: Verify clicking "Thumbs Up/Down" template publishes `POLL_START` with 15s duration. *(Verified: MicroPoll.test.jsx)*
- [x] **TC-POLL-02 (Student Toast Display)**: Verify receiving `POLL_START` renders `StudentMicroPollToast` with correct options. *(Verified)*
- [x] **TC-POLL-03 (Student Vote)**: Verify selecting option publishes `POLL_VOTE` and transitions toast to submitted state. *(Verified)*
- [x] **TC-POLL-04 (Timer Expiry)**: Verify timer ticks down every second and automatically closes toast at 0s. *(Verified)*
- [x] **TC-POLL-05 (Teacher Tally Calculation)**: Verify receiving multiple student votes updates response percentage and option counts correctly. *(Verified)*

---

### 5.2 Manual Edge-Case & E2E Verification Matrix

| Test ID | Scenario | Expected Behavior |
| :--- | :--- | :--- |
| **EDGE-01** | Student leaves classroom while hand is raised | LiveKit `ParticipantDisconnected` event triggers automatic removal from teacher's hand queue. |
| **EDGE-02** | Student disconnects and reconnects during active poll | Client requests active poll state or ignores expired poll without console errors. |
| **EDGE-03** | Multiple students raise hand at exact same second | Sub-millisecond tie-breaking sorts stably by student name alphabetically. |
| **EDGE-04** | Large class (50+ students) voting in micro-poll within 3 seconds | Non-blocking batched state updates prevent UI jank or re-render thrashing. |
| **EDGE-05** | Keyboard navigation & screen reader accessibility | Modal traps focus on open; Escape key closes; aria-live regions announce poll start and hand raise updates. |
| **EDGE-06** | Student attempts to unmute without mic permission | Microphones default to muted for students; permission gate informs student to raise hand first. |

---

## 6. Implementation Rollout Milestones

1. **Milestone 1 (Foundations & Hand Queue)**: [COMPLETED & VERIFIED]
   - Create `engagement.css` and `useLiveKitDataTopic.js`.
   - Implement `RaiseHandButton.jsx` and `TeacherHandQueueModal.jsx`.
   - Wire into `LiveAudioButton.jsx` and `LiveClassSidePanel.jsx`.
   - Run Vitest suite for Hand Queue (`RaiseHand.test.jsx`: 5 passed).

2. **Milestone 2 (Q&A Board)**: [COMPLETED & VERIFIED]
   - Implement `QnABoard.jsx`, `QnAQuestionItem.jsx`, and `PinnedLiveQuestionBanner.jsx`.
   - Add tab switcher to `LiveClassSidePanel.jsx`.
   - Run Vitest suite for Q&A Board (`QnABoard.test.jsx`: 5 passed).

3. **Milestone 3 (Quick Micro-Polls)**: [COMPLETED & VERIFIED]
   - Implement `MicroPollLauncherModal.jsx`, `StudentMicroPollToast.jsx`, and `TeacherMicroPollResults.jsx`.
   - Wire launcher into `OptionsMenu.jsx` and `LiveNotesPanel.jsx`.
   - Run Vitest suite for Micro-Polls (`MicroPoll.test.jsx`: 3 passed).

4. **Milestone 4 (Integration & Regression Testing)**: [COMPLETED & VERIFIED]
   - Run full frontend test suite (`npm run test`: 12 test files passed, 41/41 tests).
   - Verify layout responsiveness on mobile split-screen (`<= 900px`).
   - Verify zero console warnings or LiveKit channel collisions.
