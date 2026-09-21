import { NextRequest, NextResponse } from 'next/server';

/**
 * Next.js 16 Edge Proxy - V14 Security Fix
 * Adds explicit CORS headers to all /api/* routes.
 * Handles OPTIONS preflight requests so browser-based cross-origin calls work correctly.
 */

const ALLOWED_ORIGINS = [
  'https://www.mitutora.in',
  'https://mitutora.in',
  process.env.NEXT_PUBLIC_APP_URL,
].filter(Boolean) as string[];

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': 'https://www.mitutora.in',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export function proxy(req: NextRequest) {
  const origin = req.headers.get('origin');
  const allowedOrigin = origin && (ALLOWED_ORIGINS.includes(origin) || origin.includes('localhost'))
    ? origin
    : 'https://www.mitutora.in';

  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: { ...CORS_HEADERS, 'Access-Control-Allow-Origin': allowedOrigin },
    });
  }

  const response = NextResponse.next();
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, key === 'Access-Control-Allow-Origin' ? allowedOrigin : value);
  });
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
