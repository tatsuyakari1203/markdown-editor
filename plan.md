### Plan: Advanced Interactive Toolbar

**1. Goal: Smarter, More Intuitive Editing Tools**

This plan outlines the next evolution of the editor's toolbar, building upon the unified toolbar structure. The focus is to introduce more intelligent, interactive, and user-friendly features for text formatting and table creation.

**2. Rationale: Elevating the User Experience**

*   **Efficiency:** Implementing toggleable formatting and selection-aware tools will significantly speed up the writing and editing workflow.
*   **Intuitiveness:** Visual tools like a grid-based table generator are more intuitive and less error-prone than manually typing out Markdown syntax.
*   **Modern UI/UX:** These features align with user expectations for a modern, premium editor.

**3. Key Enhancements: A Two-Pronged Approach**

---

#### **Part A: Intelligent Text Formatting**

This enhancement focuses on making the formatting buttons context-aware.

*   **Selection-Aware Actions:**
    *   If a user selects the word "hello" and clicks **Bold**, the text will be transformed into `**hello**`.
    *   If no text is selected, the editor will insert `**bold text**` with the placeholder selected, as it does now.

*   **Toggle Functionality (Reversibility):**
    *   The formatting buttons will act as toggles.
    *   If a user selects the formatted text `**hello**` and clicks **Bold** again, the editor will intelligently remove the asterisks, reverting it to `hello`.
    *   This requires inspecting the text immediately surrounding the selection to check for existing formatting.

---

#### **Part B: Interactive Table Generator**

This enhancement replaces the basic table insertion with a powerful visual tool.

*   **Visual Grid Selector:**
    *   When a user clicks (or hovers over) the "Table" icon in the toolbar, a `Popover` or `DropdownMenu` will appear.
    *   This popover will contain a 10x10 grid of interactive squares.

*   **Hover-to-Select Interaction:**
    *   As the user moves their mouse over the grid, the cells will highlight to provide a visual preview of the table dimensions (e.g., moving to the third row, fourth column highlights a 3x4 grid).
    *   A label will dynamically update to show the selected size (e.g., "4x3 Table").

*   **Click-to-Create:**
    *   When the user clicks on a square in the grid, the popover will close, and a Markdown table with the selected number of rows and columns will be instantly generated and inserted at the cursor's position in the editor.

**4. Step-by-Step Implementation Plan**

1.  **Upgrade Formatting Logic (`MarkdownEditor.tsx`):**
    *   Refactor the `insertText` function into a more powerful `toggleMarkdownFormatting` function.
    *   This new function will get the selected text and its surrounding characters from the Monaco editor.
    *   It will implement the logic to check if the selection is already wrapped with the specified Markdown syntax (e.g., `**...**`, `*...*`).
    *   Based on the check, it will either add or remove the formatting characters and update the editor content.

2.  **Create the Table Generator UI (`TableGenerator.tsx`):**
    *   Create a new reusable UI component at `src/components/ui/TableGenerator.tsx`.
    *   This component will render the 10x10 grid and handle all hover and click interactions.
    *   It will take an `onSelect: (rows: number, cols: number) => void` prop to communicate the user's choice.

3.  **Integrate the Table Generator:**
    *   In `MarkdownEditor.tsx`, wrap the "Table" toolbar button in a `Popover` or `DropdownMenu` component.
    *   Place the new `<TableGenerator />` component inside this popover.
    *   Create an `insertTable(rows, cols)` function that programmatically generates a Markdown table string of the correct dimensions.
    *   Pass this `insertTable` function to the `TableGenerator`'s `onSelect` prop.

4.  **Verification:**
    *   Rigorously test the toggle functionality for all relevant formatting buttons on both selected and unselected text.
    *   Ensure the table generator popover works smoothly.
    *   Verify that tables of various sizes are generated and inserted correctly.