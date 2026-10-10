import { NextRequest, NextResponse } from 'next/server';

const BACKEND_FALLBACK = 'http://127.0.0.1:8000';

async function handler(request: NextRequest) {
  const baseUrl = process.env.BACKEND_URL || BACKEND_FALLBACK;
  const targetPath = `api${request.nextUrl.search}`;
  const targetUrl = new URL(targetPath, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);

  const headers = new Headers(request.headers);
  headers.delete('host');

  try {
    const backendResponse = await fetch(targetUrl, {
      method: request.method,
      headers,
    });
    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: backendResponse.headers,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Backend service unreachable',
        detail: error?.message || 'Failed to connect to internal backend service',
      },
      { status: 502 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const HEAD = handler;
export const OPTIONS = handler;
