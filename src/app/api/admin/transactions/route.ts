import { transactionHandlers } from '@/lib/transaction-api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const { GET, PATCH, DELETE } = transactionHandlers(true);
