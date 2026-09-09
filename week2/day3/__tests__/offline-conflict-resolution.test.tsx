// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, Root } from "react-dom/client";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EditorClientContainer } from "@/app/(dashboard)/documents/[id]/editor-client-container";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Mock router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock useDocumentSocket to simulate offline / disconnected state
vi.mock("@/lib/realtime/use-document-socket", () => ({
  useDocumentSocket: vi.fn().mockReturnValue({
    connectionState: "disconnected",
    activeUsers: [],
    presenceUsers: [],
    remoteCursors: [],
    documentVersion: 1,
    sendChange: vi.fn(),
    sendCursor: vi.fn(),
  }),
}));

// Mock useAuth
vi.mock("@/lib/auth/context", () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: "user_test", name: "Test User", email: "test@example.com" },
    logout: vi.fn(),
  }),
}));

// Mock TiptapEditor to expose an edit trigger
vi.mock("@/components/editor/tiptap-editor", () => ({
  TiptapEditor: ({ content, onChange }: any) => (
    <div data-testid="mock-tiptap">
      <div data-testid="current-editor-content">{content}</div>
      <button
        data-testid="trigger-edit"
        onClick={() => onChange("<p>My precious offline edit text</p>")}
      >
        Trigger Edit
      </button>
    </div>
  ),
}));

describe("CRITICAL 2 — Offline-Edit 409 Conflict Handling", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("preserves uncommitted local edit on 409 conflict, does not report 'saved', and surfaces draft in UI", async () => {
    const originalLocalEdit = "<p>My precious offline edit text</p>";
    const serverConflictContent = "<p>Server version written by another collaborator</p>";

    // Mock fetch to simulate 409 Conflict from /api/documents/:id
    const fetchMock = vi.fn().mockImplementation((url: string, options?: any) => {
      if (url.includes("/api/documents/doc_test_conflict") && options?.method === "PUT") {
        return Promise.resolve({
          status: 409,
          ok: false,
          json: () =>
            Promise.resolve({
              error: "Conflict: Document has been modified by another collaborator",
              currentVersion: 2,
              content: serverConflictContent,
            }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    global.fetch = fetchMock;

    await act(async () => {
      root.render(
        <EditorClientContainer
          id="doc_test_conflict"
          initialTitle="Test Document"
          initialContent="<p>Initial Content</p>"
          initialUpdatedAt={new Date().toISOString()}
          accessRole="owner"
          ownerName="Test User"
        />
      );
    });

    // 1. User makes a local edit while offline
    const editButton = container.querySelector('[data-testid="trigger-edit"]') as HTMLButtonElement;
    expect(editButton).not.toBeNull();

    await act(async () => {
      editButton.click();
    });

    // 2. Fast-forward past the 600ms offline autosave debounce timer
    await act(async () => {
      vi.advanceTimersByTime(700);
    });

    // Allow fetch resolution promise ticks to settle
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    // 3. Verification of Critical 2 Bug Fix:
    // (a) Save status MUST NOT report "saved" (original bug falsely reported "saved")
    const savedIndicator = Array.from(container.querySelectorAll("span")).find(
      (el) => el.textContent === "Saved"
    );
    expect(savedIndicator).toBeUndefined();

    const conflictIndicator = Array.from(container.querySelectorAll("span")).find(
      (el) => el.textContent === "Conflict"
    );
    expect(conflictIndicator).toBeDefined();

    // (b) Conflict banner must be visible
    const conflictBanner = container.querySelector('[data-testid="conflict-banner"]');
    expect(conflictBanner).not.toBeNull();

    // (c) User's original offline text MUST NOT be discarded or silently overwritten
    const toggleDraftButton = container.querySelector(
      '[data-testid="toggle-draft-view"]'
    ) as HTMLButtonElement;
    expect(toggleDraftButton).not.toBeNull();

    await act(async () => {
      toggleDraftButton.click();
    });

    const draftContentElement = container.querySelector(
      '[data-testid="preserved-draft-content"]'
    );
    expect(draftContentElement).not.toBeNull();
    expect(draftContentElement?.textContent).toBe(originalLocalEdit);

    // Assert that the original local edit text still exists and was not overwritten by server content
    expect(draftContentElement?.textContent).not.toBe(serverConflictContent);

    // 4. Test resolution: "Keep My Changes" re-saves using serverVersion as baseVersion
    const keepMineButton = container.querySelector(
      '[data-testid="resolve-keep-mine"]'
    ) as HTMLButtonElement;
    expect(keepMineButton).not.toBeNull();

    let putPayloadSent: any = null;
    fetchMock.mockImplementationOnce((url: string, options?: any) => {
      if (options?.method === "PUT") {
        putPayloadSent = JSON.parse(options.body);
        return Promise.resolve({
          status: 200,
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    await act(async () => {
      keepMineButton.click();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(putPayloadSent).not.toBeNull();
    expect(putPayloadSent.content).toBe(originalLocalEdit);
    expect(putPayloadSent.baseVersion).toBe(2);

    // Conflict banner should now be cleared
    expect(container.querySelector('[data-testid="conflict-banner"]')).toBeNull();
    // Status should return to Saved
    const resolvedSavedIndicator = Array.from(container.querySelectorAll("span")).find(
      (el) => el.textContent === "Saved"
    );
    expect(resolvedSavedIndicator).toBeDefined();
  });
});
