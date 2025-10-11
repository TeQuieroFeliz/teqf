'use client';

import React, { useEffect, useRef } from 'react';
import type QuillType from 'quill';
import './quill-styles.css';

type Props = {
  value?: string;
  onChange?: (html: string) => void;
  modules?: any;
  placeholder?: string;
  readOnly?: boolean;
};

export default function ReactQuill({
  value = '',
  onChange,
  modules,
  placeholder,
  readOnly,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<QuillType | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const Quill = (await import('quill')).default;
      if (!mounted || !containerRef.current) return;

      quillRef.current = new Quill(containerRef.current, {
        theme: 'snow',
        modules,
        placeholder,
        readOnly,
      });

      quillRef.current.clipboard.dangerouslyPasteHTML(value || '');

      quillRef.current.on('text-change', () => {
        const html =
          containerRef.current!.querySelector('.ql-editor')!.innerHTML;
        onChange?.(html);
      });
    })();

    return () => {
      mounted = false;
      quillRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!quillRef.current || !containerRef.current) return;
    const editor = containerRef.current.querySelector('.ql-editor')!;
    if (editor.innerHTML !== (value || '')) {
      quillRef.current!.clipboard.dangerouslyPasteHTML(value || '');
    }
  }, [value]);

  return (
    <div className="quill-wrapper">
      <div ref={containerRef} />
    </div>
  );
}
