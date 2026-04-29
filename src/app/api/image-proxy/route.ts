// app/api/image-proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('imageUrl');

  if (!imageUrl) {
    return new NextResponse('Image URL is required', { status: 400 });
  }

  try {
    // Fetch the image from the external URL on the server
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return new NextResponse('Failed to fetch image', {
        status: response.status,
      });
    }

    // Get the image data as a Blob
    const imageBlob = await response.blob();

    // Return the image data to the client
    return new NextResponse(imageBlob, {
      status: 200,
      headers: {
        'Content-Type': imageBlob.type,
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
