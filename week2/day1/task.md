Task 1: Project Setup & Architecture

Set up the foundation of a real-time collaborative document editor.

Requirements
Create the project structure for the collaborative editor.
Set up the frontend and backend applications.
Configure the database and environment variables.
Establish the basic client-server communication.
Define the architecture for real-time document synchronization.
Create a clean and scalable folder structure.
Task 2: Document Management

Implement the basic document management functionality.

Features
Create a new document.
View a document.
Update document title.
Save document content.
Delete a document.
Display a user's available documents.
Store document metadata such as:
Document ID
Title
Content
Owner
Created At
Updated At
Task 3: Basic Editor Interface

Build the initial document editor UI.

Requirements
Create a document list/sidebar.
Add a "New Document" action.
Create the document editing screen.
Add editable document title.
Add a rich-text or structured editing area.
Show basic document information.
Provide a clean and responsive interface.
Task 4: Backend API

Create the APIs required for document management.

Required Operations
POST /documents — Create document
GET /documents — Get user's documents
GET /documents/:id — Get a document
PUT /documents/:id — Update document
DELETE /documents/:id — Delete document

Implement proper validation and error handling.

Task 5: Basic Persistence

Connect the editor with the backend.

Requirements
Load document content from the database.
Display the saved content in the editor.
Save changes to the backend.
Ensure the updated content persists after page refresh.
Handle loading and error states.
Task 6: Day 1 Deliverable

By the end of Day 1, the application should allow a user to:

Create a document.
View their documents.
Open a document.
Edit the document.
Change its title.
Save the changes.
Delete the document.
Reload the page and retrieve the saved content.
Important

Real-time collaboration is not required on Day 1. The focus is to establish a stable document editor and persistence layer that will be extended with real-time synchronization in the next days.