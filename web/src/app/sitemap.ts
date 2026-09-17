import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2026-08-14');
  
  return [
    {
      url: 'https://mitutora.com',
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://mitutora.com/login',
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://mitutora.com/signup',
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://mitutora.com/legal/terms',
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: 'https://mitutora.com/legal/privacy',
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ];
}
