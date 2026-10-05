import type { Metadata } from 'next';
import StatusScreen from '@/components/status-screen';

export const metadata: Metadata = { title: 'Tạm thời gián đoạn · Sổ Thu Chi', robots: { index: false, follow: false } };

export default function ServerErrorPage() {
  return <StatusScreen variant="error" />;
}
