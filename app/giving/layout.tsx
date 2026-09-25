import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Giving Ledger',
  description: 'A source-led ledger of reported contributions, donations and in-kind support.',
};

export default function GivingLayout({children}: {children: React.ReactNode}) {
  return children;
}
