import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Submit Evidence',
  description: 'Submit a document, image, video, audio recording or source link for review.',
};

export default function SubmitLayout({children}: {children: React.ReactNode}) {
  return children;
}
