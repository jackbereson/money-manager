'use client';

import StatusScreen from '@/components/status-screen';
import './globals.css';
import './reference-style.css';
import './status-screens.css';

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <html lang="vi" data-theme="sothuchi"><head><title>Tạm thời gián đoạn · Sổ Thu Chi</title></head><body><StatusScreen variant="error" onRetry={retry} /></body></html>;
}
