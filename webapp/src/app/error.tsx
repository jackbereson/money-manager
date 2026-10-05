'use client';
import StatusScreen from '@/components/status-screen';

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <StatusScreen variant="error" onRetry={retry} />;
}
