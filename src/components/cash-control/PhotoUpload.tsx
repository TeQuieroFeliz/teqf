'use client';

import { Camera, X } from 'lucide-react';
import Image from 'next/image';
import { useRef, useEffect, useState } from 'react';

interface Props {
  value: File | null;
  onChange: (file: File | null) => void;
  label?: string;
}

export function PhotoUpload({ value, onChange, label = 'Comprobante (opcional)' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  return (
    <div>
      <label
        className="block text-xs uppercase tracking-wide mb-2"
        style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}
      >
        {label}
      </label>

      {previewUrl ? (
        <div className="relative w-full rounded-2xl overflow-hidden" style={{ height: '160px' }}>
          <Image
            src={previewUrl}
            alt="Foto"
            fill
            className="object-cover"
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute top-2 right-2 size-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.55)', color: 'white' }}
            aria-label="Quitar foto"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full rounded-2xl py-5 flex flex-col items-center gap-2 transition-colors active:opacity-70"
          style={{
            border: '2px dashed var(--tqf-beige-border)',
            background: 'white',
            color: 'var(--tqf-muted)',
          }}
        >
          <Camera className="size-6" />
          <span
            className="text-sm"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Tomar foto o seleccionar
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={e => {
          const file = e.target.files?.[0] ?? null;
          onChange(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}
