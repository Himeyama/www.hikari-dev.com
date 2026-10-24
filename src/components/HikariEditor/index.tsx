import React, {useEffect, useState} from 'react';
import Editor, {type BeforeMount, type EditorProps} from '@monaco-editor/react';

const defineHikariTheme: BeforeMount = (monaco) => {
  monaco.editor.defineTheme('hikari', {
    base: 'vs-dark',
    inherit: false,
    rules: [
      {token: '', foreground: 'ffffff', background: '000000'},
      {token: 'comment', foreground: 'aaaaaa'},
      {token: 'keyword', foreground: 'ff5555'},
      {token: 'string', foreground: '55ff55'},
      {token: 'number', foreground: 'ff55ff'},
      {token: 'type', foreground: 'ffff55'},
      {token: 'delimiter', foreground: '55ffff'},
    ],
    colors: {
      'editor.background': '#000000',
      'editor.foreground': '#ffffff',
      'editorCursor.foreground': '#ffffff',
      'editorLineNumber.foreground': '#aaaaaa',
      'editorLineNumber.activeForeground': '#ffffff',
      'editor.lineHighlightBorder': '#00aaaa',
      'editor.selectionBackground': '#0000aa',
      'editor.inactiveSelectionBackground': '#0000aa',
      'editorIndentGuide.background1': '#555555',
      'editorIndentGuide.activeBackground1': '#00aaaa',
      'editorWidget.background': '#000000',
      'editorWidget.border': '#00aaaa',
      'editorSuggestWidget.background': '#000000',
      'editorSuggestWidget.foreground': '#ffffff',
      'editorSuggestWidget.border': '#00aaaa',
      'editorSuggestWidget.selectedBackground': '#0000aa',
      'editorError.foreground': '#ff5555',
      'editorWarning.foreground': '#ffff55',
      'editorInfo.foreground': '#55ffff',
      'scrollbarSlider.background': '#00aaaa',
      'scrollbarSlider.hoverBackground': '#55ffff',
      'scrollbarSlider.activeBackground': '#55ffff',
      'focusBorder': '#55ffff',
    },
  });
};

/** Keep Monaco's behavior and page-specific options; share only its appearance. */
export default function HikariEditor({beforeMount, options, ...props}: EditorProps) {
  const [fontFamily, setFontFamily] = useState('"MS Gothic", "ＭＳ ゴシック", monospace');
  const [fontSize, setFontSize] = useState(15);

  useEffect(() => {
    const updateFont = () => {
      const fontScope = document.querySelector('.mini-app-98') ?? document.documentElement;
      setFontFamily(getComputedStyle(fontScope)
        .getPropertyValue('--ifm-font-family-monospace').trim());
      setFontSize(fontScope === document.documentElement ? 15 : 11);
    };
    updateFont();
    const observer = new MutationObserver(updateFont);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-font'],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <Editor
      {...props}
      theme="hikari"
      beforeMount={(monaco) => {
        defineHikariTheme(monaco);
        beforeMount?.(monaco);
      }}
      options={{...options, fontFamily, fontSize}}
    />
  );
}
