import { NextRequest, NextResponse } from 'next/server';

const isDev = process.env.NODE_ENV === 'development';

export async function POST(request: NextRequest) {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'REMOVE_BG_API_KEY is missing in environment variables.' },
      { status: 503 }
    );
  }

  // ── Parse incoming FormData ─────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (err) {
    if (isDev) console.error('[remove-background] FormData parse error:', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const imageEntry = formData.get('image');
  const imageUrlEntry = formData.get('imageUrl');

  // ── Resolve the image to a Blob ─────────────────────────────────────────────
  // Two accepted inputs:
  //   "image"    — a File uploaded directly (from [id]/page.tsx pending uploads)
  //   "imageUrl" — a string URL (from StandbyCard; fetched server-side to avoid browser CORS)
  let imagePart: Blob;

  if (imageEntry instanceof File && imageEntry.size > 0) {
    imagePart = imageEntry;
  } else if (typeof imageUrlEntry === 'string' && imageUrlEntry.length > 0) {
    try {
      const urlRes = await fetch(imageUrlEntry);
      if (!urlRes.ok) {
        if (isDev) console.error('[remove-background] Failed to fetch imageUrl:', urlRes.status, imageUrlEntry);
        return NextResponse.json(
          { error: `Could not retrieve source image (HTTP ${urlRes.status})` },
          { status: 502 }
        );
      }
      imagePart = await urlRes.blob();
    } catch (err) {
      if (isDev) console.error('[remove-background] Error fetching imageUrl:', err);
      return NextResponse.json(
        { error: 'Could not retrieve source image from URL' },
        { status: 502 }
      );
    }
  } else {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 });
  }

  // ── Call remove.bg ──────────────────────────────────────────────────────────
  try {
    const outgoing = new FormData();
    outgoing.append('image_file', imagePart, 'image.jpg');
    outgoing.append('size', 'auto'); // highest resolution output

    const res = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: outgoing,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg =
        (body as { errors?: { title?: string }[] })?.errors?.[0]?.title ??
        `remove.bg error ${res.status}`;
      if (isDev) console.error('[remove-background] remove.bg rejected:', res.status, body);
      return NextResponse.json({ error: msg }, { status: res.status >= 500 ? 502 : res.status });
    }

    const buffer = await res.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    if (isDev) console.error('[remove-background] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
