"use client";

/**
 * BottomBar
 * ---------
 * Word count + character count + last-saved-at timestamp + export menu.
 */
import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { Download } from "lucide-react";
import { exportDocx, exportHTML, exportMarkdown } from "./utils/export";
import styles from "./editor.module.css";

interface Props {
    editor: Editor | null;
    title: string;
    savedAt: Date | null;
}

export function BottomBar({ editor, title, savedAt }: Props) {
    const [exportOpen, setExportOpen] = useState(false);

    const text = editor?.getText() ?? "";
    const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    const charCount = text.length;

    const savedLabel = savedAt
        ? `saved ${savedAt.toLocaleTimeString()}`
        : "not saved yet";

    return (
        <div className={styles.bottomBar} aria-label="Editor status bar">
            <span>{wordCount} words</span>
            <span>{charCount} characters</span>
            <span className={styles.spacer} />
            <span>{savedLabel}</span>

            <div className={styles.exportMenu}>
                <button
                    type="button"
                    className={styles.railBtn}
                    onClick={() => setExportOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={exportOpen}
                    aria-label="Export document"
                >
                    <Download size={11} style={{ display: "inline", marginRight: 4 }} />
                    Export
                </button>
                {exportOpen && editor && (
                    <div className={styles.exportPanel} role="menu">
                        <button onClick={() => { exportDocx(editor, title);     setExportOpen(false); }} role="menuitem">Word (.docx)</button>
                        <button onClick={() => { exportMarkdown(editor, title); setExportOpen(false); }} role="menuitem">Markdown (.md)</button>
                        <button onClick={() => { exportHTML(editor, title);     setExportOpen(false); }} role="menuitem">HTML (.html)</button>
                    </div>
                )}
            </div>
        </div>
    );
}
