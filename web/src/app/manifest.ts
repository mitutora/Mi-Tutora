import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MiTutora - Home & Online Tutors in India',
    short_name: 'MiTutora',
    description:
      'Book verified 1-on-1 home and online tutors across India for CBSE, ICSE, State Boards, NEET, JEE, Coding & Languages.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#063831',
    icons: [
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
