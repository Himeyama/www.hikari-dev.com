import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";

const hikariTheme = EditorView.theme(
  {
    "&": {
      color: "#ffffff",
      backgroundColor: "#000000",
      height: "100%",
    },
    ".cm-content": {
      caretColor: "#ffffff",
      fontFamily: "var(--ifm-font-family-monospace)",
      fontSize: "15px",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "#0000aa !important",
    },
    ".cm-activeLine": {
      backgroundColor: "#000000",
    },
    ".cm-gutters": {
      backgroundColor: "#000000",
      color: "#aaaaaa",
      border: "none",
      borderRight: "1px solid #00aaaa",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "#0000aa",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#ffffff",
    },
    ".cm-scroller": {
      overflow: "auto",
    },
  },
  { dark: true },
);

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  onImageDrop?: (file: File) => void;
}

export function Editor({ value, onChange, onImageDrop }: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onImageDropRef = useRef(onImageDrop);
  onChangeRef.current = onChange;
  onImageDropRef.current = onImageDrop;

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const dropHandler = EditorView.domEventHandlers({
      drop(event) {
        const file = event.dataTransfer?.files[0];
        if (file && file.type.startsWith("image/") && onImageDropRef.current) {
          event.preventDefault();
          onImageDropRef.current(file);
          return true;
        }
        return false;
      },
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        drawSelection(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown(),
        syntaxHighlighting(defaultHighlightStyle),
        hikariTheme,
        updateListener,
        dropHandler,
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return <div ref={containerRef} className="admin-editor-area" />;
}
