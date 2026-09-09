Here's Week 2, Day 3 — following the same structure and building directly on Day 2's WebSocket/room foundation:

---

**Goal**

Build on the real-time synchronization from Day 2 by adding presence awareness (who's currently in the document), live cursor/selection tracking, and basic conflict handling — moving from "changes broadcast correctly" to "collaborators can actually see and coordinate with each other in real time."

**Task 1: Presence Tracking**

Track and broadcast who is currently active in a document.

Requirements
- Maintain a list of active users per document room (in-memory or via a shared store).
- Broadcast an updated presence list when a user joins or leaves a document.
- Send the current presence list to a user immediately upon joining a room.
- Remove a user from presence on explicit leave, tab close, and dropped connection (not just clean disconnects).

**Task 2: Live Cursor & Selection Sharing**

Show each collaborator's cursor position and/or text selection in real time.

Requirements
- Capture the local user's cursor position/selection on change.
- Broadcast cursor/selection updates through a dedicated event (e.g., `cursor_update`), separate from `document_change`.
- Render other users' cursors in the editor, each visually distinguished (e.g., by color and name label).
- Remove a user's cursor from the view when they leave the document or disconnect.
- Throttle/debounce cursor broadcasts to avoid flooding the socket connection.

**Task 3: User Identity in Collaboration Events**

Attach real user identity to all real-time events (replacing any anonymous/placeholder identifiers from Day 2).

Requirements
- Include `user_id`, `display_name`, and an assigned `color` in `join_document`, `document_change`, and `cursor_update` payloads.
- Validate that the user is authenticated and authorized (organization/tenant-scoped) before allowing them to join a document room.
- Reject or ignore events from users who aren't members of the document's organization/project.

**Task 4: Basic Conflict Handling**

Introduce a simple strategy to prevent edits from silently overwriting each other.

Requirements
- Implement a basic strategy (choose one, matching the architecture decided for this project):
- Last-write-wins with a version/timestamp check (detect and log conflicting writes), OR
- Operation-based updates (send diffs/ops instead of full content, applied in order), OR
- A basic operational transform / CRDT stub if the team is ready for it.
- Detect when two changes arrive for the same document in close succession and apply a defined resolution rule.
- Persist only the resolved/final state to the database.
- Note: full OT/CRDT-grade conflict resolution is not expected today — the goal is a documented, working baseline strategy, not a production-grade algorithm.

**Task 5: Collaboration Events (Extended)**

Extend Day 2's event set with presence and cursor events.

- `presence_update` (broadcasts current active users in a room)
- `cursor_update` (broadcasts a user's cursor/selection position)
- `sync_request` / `sync_response` (a joining client requests the latest document state and receives it before applying live updates)

Define clear payload structures for each and validate incoming data.

**Task 6: Multi-User Testing**

Test Scenario
- Open the same document in Browser A, B, and C as three different authenticated users.
- Verify all three appear in each other's presence list with correct names/colors.
- Move the cursor/selection in Browser A and verify it appears live in B and C.
- Edit simultaneously from A and B and verify the conflict-handling strategy resolves to a consistent final state on all clients.
- Close Browser C and verify it disappears from A and B's presence list and cursor view.
- Reconnect Browser C and verify it receives a full, correct sync of current document state and active presence.

**Task 7: Day 3 Deliverable**

By the end of Day 3, the application should allow:
- Multiple authenticated users to see a live, accurate list of who is in the document.
- Each user's cursor/selection to be visible to other collaborators in real time.
- All collaboration events to carry real, authenticated user identity — not anonymous IDs.
- A documented, working baseline conflict-handling strategy that prevents silent data loss.
- A joining/reconnecting client to sync to the current document state before receiving further live updates.
- Presence and cursors to update correctly on join, leave, and disconnect.

**Learning Focus**

The intern should understand:
- Presence systems in real-time applications.
- Broadcasting granular, high-frequency events (cursor/selection) separately from content events.
- Throttling/debouncing real-time event streams.
- The basics of conflict resolution strategies (last-write-wins vs. operation-based vs. OT/CRDT) and their trade-offs.
- State synchronization for clients joining mid-session.
- Multi-client testing for presence and concurrent-edit scenarios.

**Important**

Full CRDT/OT implementation, permission-based editing restrictions (view-only vs. edit roles), and edit history/versioning are not required on Day 3. The focus is making collaboration *visible* (presence, cursors) and *safe* (no silent overwrites) — deeper collaboration features come in the following days.