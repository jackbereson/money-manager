import { planHandlers } from '@/lib/plan-api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const { GET, PATCH, DELETE } = planHandlers(true);
