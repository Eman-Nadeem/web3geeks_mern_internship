Goal

Introduce real-time collaboration by connecting multiple clients through WebSockets and synchronizing document changes between users.

Task 1: WebSocket Setup

Set up real-time communication between the frontend and backend.

Requirements
Configure WebSocket communication.
Connect the frontend to the WebSocket server.
Handle client connection and disconnection.
Create basic real-time events.
Verify communication between multiple browser sessions.
Task 2: Document Rooms

Implement document-specific collaboration rooms.

Requirements
Create a unique room for each document.
Allow a user to join a document room when opening a document.
Remove the user from the room when leaving the document.
Ensure users editing different documents do not receive each other's updates.
Example

If User A and User B open Document 1, both should join the same document room.

If User C opens Document 2, User C should belong to a different room.

Task 3: Real-Time Document Updates

Implement live synchronization of document content.

Requirements

When a user changes the document:

Capture the change.
Send the change through WebSocket.
Broadcast the change to other users in the same document room.
Update the other users' editors.
Persist the latest document state.

Changes should appear without requiring a page refresh.

Task 4: Collaboration Events

Create and handle the following events:

join_document
leave_document
document_change
document_update
user_joined
user_left

Define a clear event payload structure and validate incoming data.

Task 5: Multi-User Testing

Test the editor using multiple browser windows or devices.

Test Scenario
Open the same document in Browser A and Browser B.
Start editing in Browser A.
Verify the change appears in Browser B.
Edit the document from Browser B.
Verify the change appears in Browser A.
Open a different document in Browser C.
Verify Browser C does not receive updates from the first document.
Task 6: Handle Connection States

Add basic connection handling to the editor.

Requirements

Display appropriate states such as:

Connecting
Connected
Disconnected
Reconnecting

The application should handle a temporary WebSocket disconnection without crashing the editor.

Task 7: Day 2 Deliverable

By the end of Day 2, the application should allow:

Multiple authenticated users to open the same document.
Users to join the document's collaboration room.
Users to edit the document simultaneously.
Document changes to be transmitted through WebSockets.
Changes to appear on other connected clients without refreshing.
Users to leave the collaboration room.
Different documents to maintain separate real-time sessions.
Connection and disconnection states to be handled gracefully.
Learning Focus

The intern should understand:

WebSockets.
Socket.IO or equivalent real-time technology.
Events and event-driven architecture.
Rooms/channels.
Broadcasting.
Client-server synchronization.
Real-time state updates.
Multi-client testing.
Important

Advanced conflict resolution is not required on Day 2. The focus is establishing reliable real-time communication and basic document synchronization. Conflict handling, presence indicators, permissions, and advanced collaboration features will be implemented in the following days.