import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Search the Archive',
  description: 'Search people, evidence, locations and sources in the Public Record archive.',
};

export default function SearchLayout({children}: {children: React.ReactNode}) {
  return children;
}
