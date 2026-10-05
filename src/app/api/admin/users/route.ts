import { currentUser, invalidOrigin, privateJson as json } from '@/lib/access';
import { getUsers, getTransactions } from '@/lib/mongodb';
import { z } from 'zod';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return json({ error: 'Vui lòng đăng nhập.' }, 401);
    if (user.role !== 'admin') return json({ error: 'Bạn không có quyền quản trị.' }, 403);
    const users = await (await getUsers()).find().sort({ createdAt: -1 }).toArray();
    const counts = await (await getTransactions()).aggregate<{ _id: string; count: number }>([{ $group: { _id: '$ownerId', count: { $sum: 1 } } }]).toArray();
    const byOwner = new Map(counts.map(row => [row._id, row.count]));
    return json({ users: users.map(row => ({ id: row.ownerId, name: row.name, email: row.email, role: row.role, status: row.status, createdAt: row.createdAt, lastLoginAt: row.lastLoginAt, transactionCount: byOwner.get(row.ownerId) || 0 })) });
  } catch { return json({ error: 'Không thể tải người dùng.' }, 503); }
}
export async function PATCH(request: Request) {
  try {
    const actor = await currentUser();
    if (!actor) return json({ error: 'Vui lòng đăng nhập.' }, 401);
    if (actor.role !== 'admin') return json({ error: 'Bạn không có quyền quản trị.' }, 403);
    if (invalidOrigin(request)) return json({ error: 'Yêu cầu không hợp lệ.' }, 403);
    let body;
    try { body = await request.json(); } catch { return json({ error: 'JSON không hợp lệ.' }, 400); }
    const parsed = z.object({ id: z.string().min(1), role: z.enum(['admin', 'member']), status: z.enum(['active', 'blocked']) }).safeParse(body);
    if (!parsed.success) return json({ error: 'Thông tin không hợp lệ.' }, 400);
    if (parsed.data.id === actor.ownerId) return json({ error: 'Không thể thay đổi quyền hoặc khóa chính tài khoản đang đăng nhập.' }, 400);
    const result = await (await getUsers()).updateOne({ ownerId: parsed.data.id }, { $set: { role: parsed.data.role, status: parsed.data.status } });
    if (!result.matchedCount) return json({ error: 'Người dùng không tồn tại.' }, 404);
    return json({ ok: true });
  } catch { return json({ error: 'Không thể cập nhật người dùng.' }, 503); }
}
