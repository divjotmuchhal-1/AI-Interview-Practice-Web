import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Authenticated app routes hold no indexable content and would waste crawl
      // budget; /api is never useful in search results.
      disallow: ['/practice', '/api/'],
    },
    sitemap: 'https://aicodingprep.com/sitemap.xml',
  };
}
