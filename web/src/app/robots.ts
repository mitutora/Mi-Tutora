import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/signup', '/legal/'],
        disallow: ['/dashboard/', '/api/', '/_next/'],
      },
    ],
    sitemap: 'https://www.mitutora.in/sitemap.xml',
    host: 'https://www.mitutora.in',
  };
}
