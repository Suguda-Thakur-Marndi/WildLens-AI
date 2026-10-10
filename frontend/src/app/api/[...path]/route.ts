import { NextRequest, NextResponse } from 'next/server';

const BACKEND_FALLBACK = 'http://127.0.0.1:8000';

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const baseUrl = process.env.BACKEND_URL || BACKEND_FALLBACK;
  const targetPath = `api/${path.join('/')}${request.nextUrl.search}`;
  const targetUrl = new URL(targetPath, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);

  const headers = new Headers(request.headers);
  headers.delete('host');

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    // @ts-expect-error duplex required for streaming request body in fetch
    init.duplex = 'half';
  }

  try {
    const backendResponse = await fetch(targetUrl, init);
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

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
export const HEAD = proxyRequest;
export const OPTIONS = proxyRequest;
