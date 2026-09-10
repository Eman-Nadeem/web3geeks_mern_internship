// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { normalizeHtml } from "@/components/editor/tiptap-editor";

describe("Self-triggered content-reset loop investigation", () => {
  it("checks whether normalizeHtml transforms editor HTML with soft break", () => {
    const tiptapHtmlWithBr = "<p>First line<br>Second line</p>";
    const normalized = normalizeHtml(tiptapHtmlWithBr);
    expect(normalized).not.toBe(tiptapHtmlWithBr);
    expect(normalized).toBe("<p>First line</p><p>Second line</p>");
  });

  it("checks whether normalizeHtml strips empty paragraphs", () => {
    const tiptapHtmlWithEmptyP = "<p>First line</p><p></p><p>Second line</p>";
    const normalized = normalizeHtml(tiptapHtmlWithEmptyP);
    expect(normalized).not.toBe(tiptapHtmlWithEmptyP);
    expect(normalized).toBe("<p>First line</p><p>Second line</p>");
  });

  it("checks whether the asymmetry causes enteredSetContent to evaluate to true for self-edits", () => {
    // Suppose user inserts a line break (Shift+Enter)
    const currentEditorHtml = "<p>First line<br>Second line</p>";
    // onUpdate emitted this exact string:
    const lastEmittedHtml = currentEditorHtml;
    // Parent receives it and passes it back as `content`:
    const content = currentEditorHtml;

    // Inside external content sync useEffect:
    const normalized = normalizeHtml(content);
    const enteredSetContent = normalized !== lastEmittedHtml && normalized !== currentEditorHtml;

    // Asymmetric comparison: normalized is compared against unnormalized lastEmitted and currentEditorHtml!
    expect(enteredSetContent).toBe(true);
  });

  it("checks whether symmetric comparison prevents the false positive", () => {
    const currentEditorHtml = "<p>First line<br>Second line</p>";
    const lastEmittedHtml = currentEditorHtml;
    const content = currentEditorHtml;

    // Proposed fix: normalize both sides or store lastEmittedHtml as normalized
    const normalized = normalizeHtml(content);
    const normalizedLastEmitted = normalizeHtml(lastEmittedHtml);
    const enteredSetContentSymmetric =
      normalized !== normalizedLastEmitted && normalized !== normalizeHtml(currentEditorHtml);

    expect(enteredSetContentSymmetric).toBe(false);
  });

  it("confirms genuine remote updates still trigger setContent", () => {
    // Local editor has user's local content
    const currentEditorHtml = "<p>Local user content</p>";
    const lastEmittedHtml = normalizeHtml(currentEditorHtml);

    // Remote collaborator sends new content
    const remoteIncomingContent = "<p>Remote collaborator edited this document</p>";

    const normalized = normalizeHtml(remoteIncomingContent);
    const normalizedLastEmitted = normalizeHtml(lastEmittedHtml);
    const normalizedEditor = normalizeHtml(currentEditorHtml);

    const willTriggerRemoteSync =
      normalized !== normalizedLastEmitted && normalized !== normalizedEditor;

    expect(willTriggerRemoteSync).toBe(true);
  });

  it("confirms identical remote updates do not redundantly trigger setContent", () => {
    const currentEditorHtml = "<p>Existing synchronized content</p>";
    const lastEmittedHtml = normalizeHtml(currentEditorHtml);

    // Incoming payload happens to match current editor state
    const incomingIdenticalContent = "<p>Existing synchronized content</p>";

    const normalized = normalizeHtml(incomingIdenticalContent);
    const normalizedLastEmitted = normalizeHtml(lastEmittedHtml);
    const normalizedEditor = normalizeHtml(currentEditorHtml);

    const willTriggerRemoteSync =
      normalized !== normalizedLastEmitted && normalized !== normalizedEditor;

    expect(willTriggerRemoteSync).toBe(false);
  });
});
