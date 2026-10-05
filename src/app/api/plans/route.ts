import { planHandlers } from '@/lib/plan-api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const { GET, POST, PATCH, DELETE } = planHandlers();
