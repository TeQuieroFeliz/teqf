import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Background removal not configured' }, { status: 503 });
  }

  let image: File | null = null;
  try {
    const formData = await request.formData();
    image = formData.get('image') as File | null;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!image || image.size === 0) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 });
  }

  try {
    const outgoing = new FormData();
    outgoing.append('image_file', image);
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
    console.error('[remove-background]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
