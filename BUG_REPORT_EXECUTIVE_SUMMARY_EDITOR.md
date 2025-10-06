# Bug Report: Executive Summary Editor Issues

**Date:** 2025-10-07
**Component:** Executive Summary Rich Text Editor
**File:** `/src/renderer/components/export/ExportConfigurationModal.tsx`
**Severity:** High - Core functionality issues affecting user experience

---

## Summary

The executive summary editor has multiple persistent issues related to content formatting, editing behavior, and state management. The editor fails to maintain consistent formatting across operations and has improper content clearing during generation.

---

## Bug #1: Formatting Not Preserved When Editing

### Description
When a user edits the executive summary content that was generated with formatting (bold headers, styled text), the formatting disappears and converts to plain text as soon as they start typing.

### Steps to Reproduce
1. Generate an executive summary using AI (content comes with **bold** headers)
2. Editor displays formatted content correctly (bold headers visible)
3. Click into the editor and start typing or editing text
4. Observe that new text appears as plain text without any formatting
5. Close the export modal and reopen it
6. Observe that all formatting is lost - content is now plain text

### Expected Behavior
- AI-generated formatting (bold headers like **Overview**, **Key Findings**) should persist during editing
- New text typed by user should maintain the ability to be formatted (via Ctrl+B, etc.)
- When modal is reopened, the content should retain all formatting exactly as it was

### Actual Behavior
- Formatting is preserved initially but disappears when editing
- New text is inserted as plain text with no formatting
- Formatting is completely lost when modal is closed and reopened
- Only the preview pane maintains correct formatting; editor shows plain text

### Root Cause
- Storage mismatch: We store **plain text** in `config.executiveSummaryContent` but display **HTML** in the editor
- When `handleEditorInput` fires, it extracts `innerText` (plain text) and stores that
- When reopening modal, `renderMarkdownForEditor()` converts markdown syntax (`**text**`) to HTML, but user-edited content doesn't have markdown syntax anymore
- ContentEditable naturally produces mixed content (HTML + plain text), but we only persist the plain text version

### Technical Details
```typescript
// Current problematic flow:
1. AI generates: "**Overview**\n\nThis is text"
2. renderMarkdownForEditor() converts to: "<strong>Overview</strong><br/><br/>This is text"
3. User edits, adds plain text
4. handleEditorInput() extracts: e.currentTarget.innerText (loses all HTML tags)
5. Stores: "Overview\n\nThis is text" (no formatting markers)
6. On reopen: renderMarkdownForEditor() looks for "**" but finds none
7. Result: Plain text with no formatting
```

---

## Bug #2: Generate Button Doesn't Properly Wipe Content

### Description
When clicking "Generate" while existing content is in the editor, the old content remains visible in the editor input box even though the loading overlay appears.

### Steps to Reproduce
1. Generate an executive summary (content appears in editor)
2. Click "Generate" button again to regenerate
3. Observe the editor input box

### Expected Behavior
- Click "Generate" → old content disappears immediately
- Loading overlay appears over an empty/blank editor
- New content appears when generation completes

### Actual Behavior
- Click "Generate" → old content stays visible in the editor
- Loading overlay appears but old content is still rendered underneath/visible
- User sees confusing state with old content + "Generating..." message

### Root Cause
The issue was partially addressed but the fix has inconsistencies:
- State is cleared: `onConfigChange({ executiveSummaryContent: '', executiveHighlights: [] })`
- But the useEffect that updates editor HTML has conditions that may not trigger immediately
- The condition `config.executiveSummaryContent === ''` check was added but timing issues persist

### Code Location
Lines 1499-1504 and 182-198 in ExportConfigurationModal.tsx

---

## Bug #3: Formatting Inconsistency Between Editor and Preview

### Description
The editor input box and the preview pane show different formatting states, creating user confusion about what the actual saved content looks like.

### Steps to Reproduce
1. Generate executive summary with AI
2. Edit some text in the editor
3. Compare editor (right side) with preview (left side)

### Expected Behavior
- Editor and preview should show identical formatting
- Both should display bold headers, line breaks, and styling consistently
- WYSIWYG principle: What You See (in editor) Is What You Get (in preview/export)

### Actual Behavior
- Preview shows correct formatting with bold headers
- Editor shows formatting initially but loses it during editing
- After editing, editor shows plain text while preview still shows formatted version
- Creates confusion: user doesn't know which version is "correct"

---

## Bug #4: Modal Reopen Loses All Formatting

### Description
Closing and reopening the export modal causes complete loss of all text formatting in the editor, even though the preview may still show formatted text.

### Steps to Reproduce
1. Generate executive summary (has bold headers)
2. Close export modal
3. Reopen export modal
4. Check editor content

### Expected Behavior
- All formatting preserved exactly as it was before closing
- Bold headers remain bold
- Line breaks remain intact
- Editor shows formatted content identical to when it was closed

### Actual Behavior
- All formatting lost
- Headers appear as plain text
- Content structure remains but styling is gone
- Must regenerate from AI to get formatting back

---

## Attempted Fixes & Current State

### Fix Attempts Made:
1. ✅ Added localStorage persistence for executive summary content
2. ✅ Added useEffect to clear editor when content is empty
3. ✅ Added keyboard shortcuts (Ctrl+B, Ctrl+I) for formatting
4. ✅ Added check for empty content to clear editor innerHTML
5. ❌ Formatting persistence still broken
6. ❌ Storage/display mismatch not resolved

### Current Code Issues:
```typescript
// Line 207: Only stores plain text
onConfigChange({ executiveSummaryContent: newText });

// Lines 186-197: Conditional rendering doesn't handle all cases
if (config.executiveSummaryContent === '') {
  editorRef.current.innerHTML = '';
  isInitialLoadRef.current = true;
  return;
}

if (isInitialLoadRef.current || config.executiveSummaryContent.includes('**')) {
  const rendered = renderMarkdownForEditor(config.executiveSummaryContent);
  editorRef.current.innerHTML = rendered;
  isInitialLoadRef.current = false;
}
// Problem: If content doesn't include '**', it won't re-render
```

---

## Recommended Solutions

### Option 1: Store HTML Instead of Plain Text (Recommended)
**Pros:**
- Preserves all formatting natively
- No conversion needed
- Editor and storage in sync

**Cons:**
- Requires updating storage schema
- Need to sanitize HTML for security
- Larger storage footprint

**Implementation:**
```typescript
const handleEditorInput = (e: React.FormEvent<HTMLDivElement>) => {
  const htmlContent = e.currentTarget.innerHTML;
  const plainText = e.currentTarget.innerText || '';

  // Store HTML, use plain text only for character counting
  onConfigChange({
    executiveSummaryContent: htmlContent,
    executiveSummaryPlainText: plainText // for character limits
  });
};
```

### Option 2: Use Markdown Throughout
**Pros:**
- Clean storage format
- Human-readable
- Standard syntax

**Cons:**
- User must learn markdown
- Requires converting HTML back to markdown on edit
- Complex for rich formatting

### Option 3: Dual Storage (HTML + Plain Text)
**Pros:**
- Best of both worlds
- HTML for display, plain text for processing
- Backward compatible

**Cons:**
- More storage space
- Need to keep both in sync

---

## Priority & Impact

**Priority:** High
**Impact:** High
**User Experience:** Severely Degraded

**Affected User Flows:**
- Creating executive summaries
- Editing AI-generated content
- Reopening export modal to review content
- Exporting reports with executive summaries

**Current Workarounds:**
- Regenerate from AI each time (loses user edits)
- Don't close modal if you want to keep formatting
- Don't edit AI-generated content
- All workarounds are unacceptable for production use

---

## Test Cases Needed

Once fixed, verify:
1. ✅ Generate content → formatting appears
2. ✅ Edit content → formatting preserved
3. ✅ Close modal → reopen → formatting intact
4. ✅ Type new text → can apply formatting via Ctrl+B
5. ✅ Click Generate with existing content → old content clears immediately
6. ✅ Editor matches preview at all times
7. ✅ Reload page → formatting persists from localStorage
8. ✅ Character count works correctly with formatted text
9. ✅ Export PDF shows same formatting as editor

---

## Related Files

- `/src/renderer/components/export/ExportConfigurationModal.tsx` (lines 176-244, 1499-1504, 1618-1680)
- `/src/renderer/components/SimpleDashboard.tsx` (lines 176-198, 1490-1523)
- `/src/renderer/components/export/types.ts` (ExecutiveHighlight interface)
- `/src/renderer/utils/geminiClient.ts` (generateExecutiveSummary method)

---

## Additional Notes

This is a fundamental architecture issue with contentEditable and state management. The quick fixes applied (useEffect conditions, keyboard shortcuts) are Band-Aids that don't address the core problem: **we're storing plain text but working with HTML**.

A proper fix requires deciding on a single source of truth for content storage and ensuring the editor, preview, and persistence all work with that same format consistently.
