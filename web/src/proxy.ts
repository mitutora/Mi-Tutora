import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js 16 Edge Proxy - V14 Security Fix
 * Adds explicit CORS headers to all /api/* routes.
 * Handles OPTIONS preflight requests so browser-based cross-origin calls work correctly.
 */

const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_APP_URL ?? 'https://mitutora.com';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export function proxy(req: NextRequest) {
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  const response = NextResponse.next();
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
