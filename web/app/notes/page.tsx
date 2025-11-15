import { requireSubscription } from '@/lib/auth/server';
import NotesClient from './_components/NotesClient';

export const metadata = {
  title: 'Notes | relevel.me',
  description: 'Your knowledge graph - notes connected by ideas',
};

export default async function NotesPage() {
  // Require active subscription
  await requireSubscription();

  return <NotesClient />;
}
