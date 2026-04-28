'use client';

import { ExternalLink, MapPin } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window { google?: any; }
}

export type VenueData = {
  name: string;
  address?: string;
  placeId?: string;
  mapUrl?: string;
};

type Props = {
  value: string;
  address?: string;
  mapUrl?: string;
  onChange: (data: VenueData) => void;
  placeholder?: string;
};

let mapsLoaded = false;
let mapsLoading = false;
const mapsCallbacks: (() => void)[] = [];

function loadGoogleMaps(apiKey: string, cb: () => void) {
  if (mapsLoaded) { cb(); return; }
  mapsCallbacks.push(cb);
  if (mapsLoading) return;
  mapsLoading = true;
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
  script.async = true;
  script.defer = true;
  script.onload = () => {
    mapsLoaded = true;
    mapsCallbacks.forEach(fn => fn());
    mapsCallbacks.length = 0;
  };
  document.head.appendChild(script);
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid var(--tqf-beige-border)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.875rem',
  color: 'var(--tqf-dark)',
  background: 'white',
  outline: 'none',
};

export default function VenueSearchInput({ value, address, mapUrl, onChange, placeholder }: Props) {
  const inputRef       = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) return;
    loadGoogleMaps(apiKey, () => setReady(true));
  }, [apiKey]);

  useEffect(() => {
    if (!ready || !inputRef.current || autocompleteRef.current) return;
    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment', 'geocode'],
    });
    autocompleteRef.current = ac;
    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      onChange({
        name    : place.name ?? inputRef.current?.value ?? '',
        address : place.formatted_address,
        placeId : place.place_id,
        mapUrl  : place.url,
      });
    });
  }, [ready, onChange]);

  // Sync input value without triggering autocomplete re-init
  useEffect(() => {
    if (inputRef.current && !autocompleteRef.current) {
      inputRef.current.value = value;
    }
  }, [value]);

  return (
    <div>
      <div className="relative">
        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 pointer-events-none" style={{ color: 'var(--tqf-muted)' }} />
        <input
          ref={inputRef}
          type="text"
          defaultValue={value}
          onChange={e => {
            if (!autocompleteRef.current) onChange({ name: e.target.value, address, mapUrl });
          }}
          placeholder={placeholder ?? (apiKey ? 'Cerca venue su Google Maps...' : 'Nome venue')}
          style={{ ...inputStyle, paddingLeft: '2rem' }}
        />
      </div>
      {address && (
        <div className="mt-1 flex items-start gap-1">
          <p className="text-xs flex-1" style={{ color: 'var(--tqf-muted)', fontFamily: 'var(--font-body)', lineHeight: 1.4 }}>
            {address}
          </p>
          {mapUrl && (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 transition-opacity hover:opacity-70"
              style={{ color: 'var(--tqf-bordeaux)' }}
            >
              <ExternalLink className="size-3.5 mt-0.5" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
