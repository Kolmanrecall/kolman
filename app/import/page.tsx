import { ImportPanel } from '@/components/import-panel';
import { requirePageUser } from '@/lib/page-auth';

export default async function ImportPage() {
  await requirePageUser();
  return <ImportPanel />;
}
