import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Evidence Archive',
  description: 'Search and filter published records with source provenance and verification status.',
};

export default function EvidenceLayout({children}: {children: React.ReactNode}) {
  return children;
}
