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
  onImageUpload?: (file: File) => Promise<string>;
};

export default function ReactQuill({
  value = '',
  onChange,
  modules,
  placeholder,
  readOnly,
  onImageUpload,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<QuillType | null>(null);
  // Ref so the Quill handler always calls the latest version without re-initializing
  const onImageUploadRef = useRef(onImageUpload);

  useEffect(() => {
    onImageUploadRef.current = onImageUpload;
  }, [onImageUpload]);

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

      // Override the toolbar image button to upload instead of using base64
      const toolbar = quillRef.current.getModule('toolbar') as any;
      if (toolbar) {
        toolbar.addHandler('image', () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/png,image/jpeg,image/webp,image/gif';
          input.click();
          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file || !onImageUploadRef.current) return;
            const url = await onImageUploadRef.current(file);
            if (url && quillRef.current) {
              const range = quillRef.current.getSelection(true);
              quillRef.current.insertEmbed(range.index, 'image', url);
              quillRef.current.setSelection(range.index + 1, 0);
            }
          };
        });
      }

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
