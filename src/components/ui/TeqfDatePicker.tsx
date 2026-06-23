'use client';

import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// ── Locale data ───────────────────────────────────────────────────────────────

const MONTHS = {
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  es: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
};
const DAYS = {
  en: ['Su','Mo','Tu','We','Th','Fr','Sa'],
  es: ['Do','Lu','Ma','Mi','Ju','Vi','Sá'],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function firstDay(y: number, m: number)    { return new Date(y, m, 1).getDay(); }

function toYMD(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function parseYMD(s: string): [number,number,number] | null {
  if (!s) return null;
  const [y,m,d] = s.split('-').map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return [y, m - 1, d]; // month 0-indexed
}

function formatDisplay(s: string, lang: 'en' | 'es') {
  const p = parseYMD(s);
  if (!p) return '';
  const [y, m, d] = p;
  if (lang === 'es') {
    return new Date(y, m, d).toLocaleDateString('es-MX', { day:'2-digit', month:'2-digit', year:'numeric' });
  }
  return new Date(y, m, d).toLocaleDateString('en-US', { day:'2-digit', month:'2-digit', year:'numeric' });
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface TeqfDatePickerProps {
  value: string;              // YYYY-MM-DD or ''
  onChange: (v: string) => void;
  lang: 'en' | 'es';
  placeholder?: string;
  hasError?: boolean;
  disabled?: boolean;
}

export function TeqfDatePicker({
  value, onChange, lang, placeholder, hasError = false, disabled = false,
}: TeqfDatePickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parsed = parseYMD(value);
  const [open, setOpen]         = useState(false);
  const [viewYear, setViewYear] = useState(parsed?.[0] ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.[1] ?? today.getMonth());
  const containerRef            = useRef<HTMLDivElement>(null);
  const [above, setAbove]       = useState(false);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Decide popup direction on open
  useEffect(() => {
    if (!open || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setAbove(rect.bottom + 310 > window.innerHeight && rect.top > 310);
  }, [open]);

  // Sync view when value changes externally
  useEffect(() => {
    if (value) {
      const p = parseYMD(value);
      if (p) { setViewYear(p[0]); setViewMonth(p[1]); }
    }
  }, [value]);

  function prevMonth() {
    setViewMonth(m => { if (m === 0) { setViewYear(y => y - 1); return 11; } return m - 1; });
  }
  function nextMonth() {
    setViewMonth(m => { if (m === 11) { setViewYear(y => y + 1); return 0; } return m + 1; });
  }

  function selectDay(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(0, 0, 0, 0);
    if (d < today) return;
    onChange(toYMD(viewYear, viewMonth, day));
    setOpen(false);
  }

  function isPast(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(0, 0, 0, 0);
    return d < today;
  }
  function isSelected(day: number) {
    return !!parsed && parsed[0] === viewYear && parsed[1] === viewMonth && parsed[2] === day;
  }
  function isTodayCell(day: number) {
    return today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
  }

  // Build grid cells (null = empty padding)
  const dim = daysInMonth(viewYear, viewMonth);
  const offset = firstDay(viewYear, viewMonth);
  const cells: Array<number | null> = [
    ...Array(offset).fill(null),
    ...Array.from({ length: dim }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const display     = formatDisplay(value, lang);
  const ph          = placeholder ?? (lang === 'es' ? 'Seleccionar fecha del evento' : 'Select event date');
  const months      = MONTHS[lang];
  const dayLabels   = DAYS[lang];

  // Styles
  const inputBorder = hasError ? '#fca5a5' : open ? 'var(--tqf-gold)' : 'var(--tqf-beige-border)';
  const inputShadow = open ? '0 0 0 3px rgba(180,149,83,0.18)' : 'none';

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>

      {/* ── Trigger input ── */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '8px 12px',
          border: `0.5px solid ${inputBorder}`,
          borderRadius: '8px',
          background: 'white',
          fontFamily: 'var(--font-body)',
          fontSize: '14px',
          color: display ? '#1A0F0A' : 'var(--tqf-muted)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'left',
          boxShadow: inputShadow,
          transition: 'border-color 0.15s, box-shadow 0.15s',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{ flex: 1, lineHeight: 1.5 }}>{display || ph}</span>
        <CalendarIcon style={{ width: 16, height: 16, color: 'var(--tqf-gold)', flexShrink: 0 }} />
      </button>

      {/* ── Calendar popup ── */}
      {open && (
        <div
          style={{
            position: 'absolute',
            [above ? 'bottom' : 'top']: 'calc(100% + 6px)',
            left: 0,
            zIndex: 200,
            background: 'white',
            border: '0.5px solid var(--tqf-beige-border)',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            padding: '16px',
            minWidth: '272px',
            userSelect: 'none',
          }}
        >
          {/* Month / year header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <NavBtn onClick={prevMonth} aria-label="Previous month"><ChevronLeft className="size-4" /></NavBtn>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '18px',
                fontWeight: 400,
                color: 'var(--tqf-bordeaux)',
                letterSpacing: '0.01em',
              }}
            >
              {months[viewMonth]} {viewYear}
            </span>
            <NavBtn onClick={nextMonth} aria-label="Next month"><ChevronRight className="size-4" /></NavBtn>
          </div>

          {/* Day-of-week headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
            {dayLabels.map(l => (
              <div
                key={l}
                style={{
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  color: 'var(--tqf-muted)',
                  fontFamily: 'var(--font-body)',
                  padding: '2px 0',
                }}
              >
                {l}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} style={{ height: '36px' }} />;
              const past = isPast(day);
              const sel  = isSelected(day);
              const tod  = isTodayCell(day);
              return (
                <DayCell
                  key={i}
                  day={day}
                  past={past}
                  selected={sel}
                  today={tod}
                  onClick={() => selectDay(day)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NavBtn({ onClick, children, 'aria-label': label }: {
  onClick: () => void; children: React.ReactNode; 'aria-label': string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '28px', height: '28px',
        border: 'none', borderRadius: '6px',
        background: hovered ? 'var(--tqf-cipria-light)' : 'transparent',
        color: hovered ? 'var(--tqf-bordeaux)' : 'var(--tqf-gold)',
        cursor: 'pointer',
        transition: 'background 0.12s, color 0.12s',
        padding: 0,
      }}
    >
      {children}
    </button>
  );
}

function DayCell({ day, past, selected, today, onClick }: {
  day: number; past: boolean; selected: boolean; today: boolean; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  let bg    = 'transparent';
  let color = '#1A0F0A';
  let border = 'none';

  if (selected) {
    bg = 'var(--tqf-bordeaux)';
    color = 'white';
  } else if (past) {
    color = 'var(--tqf-muted)';
  } else if (hovered) {
    bg = 'var(--tqf-cipria-light)';
  }

  if (today && !selected) {
    border = '1.5px solid var(--tqf-cipria)';
  }

  return (
    <button
      type="button"
      disabled={past}
      onClick={onClick}
      onMouseEnter={() => !past && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '36px', height: '36px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '8px',
        fontSize: '14px',
        fontFamily: 'var(--font-body)',
        border,
        background: bg,
        color,
        textDecoration: past ? 'line-through' : 'none',
        cursor: past ? 'not-allowed' : 'pointer',
        opacity: past ? 0.4 : 1,
        transition: 'background 0.1s',
        padding: 0,
        justifySelf: 'center',
      }}
    >
      {day}
    </button>
  );
}
