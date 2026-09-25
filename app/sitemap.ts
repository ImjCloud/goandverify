import type {MetadataRoute} from 'next';
import {people} from '@/lib/data';
import {giving} from '@/lib/giving';
import {getPublishedEvidence} from '@/lib/evidenceSource';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const staticRoutes = ['', '/about', '/contact', '/corrections', '/evidence', '/giving', '/privacy', '/search', '/submit', '/terms'];
  const evidence = await getPublishedEvidence();

  return [
    ...staticRoutes.map(path => ({url: `${baseUrl}${path}`, changeFrequency: 'weekly' as const, priority: path === '' ? 1 : 0.7})),
    ...people.map(person => ({url: `${baseUrl}/people/${person.slug}`, changeFrequency: 'monthly' as const, priority: 0.8})),
    ...giving.map(record => ({url: `${baseUrl}/giving/${record.slug}`, changeFrequency: 'monthly' as const, priority: 0.6})),
    ...evidence.map(record => ({url: `${baseUrl}/evidence/${record.slug}`, changeFrequency: 'weekly' as const, priority: 0.8})),
  ];
}
