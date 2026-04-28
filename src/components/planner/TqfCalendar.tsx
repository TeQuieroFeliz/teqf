'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

type Props = {
  selected: string[];
  onChange: (dates: string[]) => void;
  monthsFull?: string[];
  monthsShort?: string[];
  days?: string[];
  daySelected?: string;
  daysSelected?: string;
};

const IT_MONTHS_FULL  = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const IT_MONTHS_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const IT_DAYS         = ['Lu','Ma','Me','Gi','Ve','Sa','Do'];

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TqfCalendar({
  selected, onChange,
  monthsFull  = IT_MONTHS_FULL,
  monthsShort = IT_MONTHS_SHORT,
  days        = IT_DAYS,
  daySelected  = 'giorno selezionato',
  daysSelected = 'giorni selezionati',
}: Props) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [view, setView]   = useState<'days' | 'months'>('days');

  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7;

  const cells: (Date | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => new Date(year, month, i + 1)),
  ];

  const prevMonth = () => month === 0  ? (setYear(y => y - 1), setMonth(11)) : setMonth(m => m - 1);
  const nextMonth = () => month === 11 ? (setYear(y => y + 1), setMonth(0))  : setMonth(m => m + 1);

  const toggle = (d: Date) => {
    const iso = toISO(d);
    onChange(selected.includes(iso) ? selected.filter(s => s !== iso) : [...selected, iso].sort());
  };

  const selectMonth = (m: number) => { setMonth(m); setView('days'); };

  const todayISO = toISO(today);
  const navBtn: React.CSSProperties = { color: 'var(--tqf-bordeaux)' };

  return (
    <div style={{ width: 304, userSelect: 'none' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-1 mb-3">
        <button
          type="button"
          onClick={view === 'days' ? prevMonth : () => setYear(y => y - 1)}
          className="size-8 flex items-center justify-center rounded-full transition-colors"
          style={navBtn}
          onMouseOver={e => (e.currentTarget.style.background = 'var(--tqf-cipria-light)')}
          onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
        >
          <ChevronLeft className="size-4" />
        </button>

        <button
          type="button"
          onClick={() => setView(v => v === 'days' ? 'months' : 'days')}
          className="flex items-center gap-1 px-2 py-1 rounded-lg transition-colors"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--tqf-dark)', fontSize: '1rem', fontWeight: 400, letterSpacing: '0.04em' }}
          onMouseOver={e => (e.currentTarget.style.background = 'var(--tqf-cipria-light)')}
          onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
        >
          {view === 'days' ? `${monthsFull[month]} ${year}` : year}
          <ChevronRight
            className="size-3.5 transition-transform"
            style={{ color: 'var(--tqf-muted)', transform: view === 'months' ? 'rotate(90deg)' : 'rotate(270deg)' }}
          />
        </button>

        <button
          type="button"
          onClick={view === 'days' ? nextMonth : () => setYear(y => y + 1)}
          className="size-8 flex items-center justify-center rounded-full transition-colors"
          style={navBtn}
          onMouseOver={e => (e.currentTarget.style.background = 'var(--tqf-cipria-light)')}
          onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {view === 'months' ? (
        <div className="grid grid-cols-3 gap-1.5 px-1">
          {monthsShort.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => selectMonth(i)}
              className="py-2 rounded-lg text-sm transition-all"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize  : '0.8rem',
                background: i === month ? 'var(--tqf-bordeaux)' : 'var(--tqf-cipria-light)',
                color     : i === month ? 'white' : 'var(--tqf-bordeaux)',
                border    : i === month ? 'none' : '1px solid var(--tqf-cipria)',
                fontWeight: i === month ? 600 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-7 mb-1">
            {days.map(d => (
              <div key={d} className="text-center py-1"
                style={{ fontSize: '0.65rem', letterSpacing: '0.08em', color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)' }}>
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => {
              if (!d) return <div key={`e-${i}`} />;
              const iso        = toISO(d);
              const isSelected = selected.includes(iso);
              const isToday    = iso === todayISO;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => toggle(d)}
                  className="aspect-square flex items-center justify-center rounded-full text-sm transition-all"
                  style={{
                    background   : isSelected ? 'var(--tqf-bordeaux)' : isToday ? 'var(--tqf-cipria)' : 'transparent',
                    color        : isSelected ? 'white' : isToday ? 'var(--tqf-bordeaux)' : 'var(--tqf-dark)',
                    fontFamily   : 'var(--font-body)',
                    fontSize     : '0.8rem',
                    fontWeight   : isSelected ? 600 : 400,
                    outline      : isSelected ? '2px solid var(--tqf-bordeaux)' : 'none',
                    outlineOffset: isSelected ? '1px' : '0',
                  }}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </>
      )}

      {selected.length > 0 && (
        <p className="mt-3 text-center text-xs" style={{ color: 'var(--tqf-bordeaux)', fontFamily: 'var(--font-body)' }}>
          {selected.length} {selected.length === 1 ? daySelected : daysSelected}
        </p>
      )}
    </div>
  );
}
