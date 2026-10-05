import { ObjectId } from 'mongodb';
import { currentUser, invalidOrigin, privateJson as json } from './access.js';
import { getTransactions, getUsers } from './mongodb.js';
import { transactionSchema } from './transactions.js';

export function transactionHandlers(admin = false) {
  async function handle(request: Request, method: 'GET' | 'POST' | 'PATCH' | 'DELETE') {
    try {
      const user = await currentUser();
      if (!user) return json({ error: 'Vui lòng đăng nhập.' }, 401);
      if (admin && user.role !== 'admin') return json({ error: 'Bạn không có quyền quản trị.' }, 403);
      if (method !== 'GET' && invalidOrigin(request)) return json({ error: 'Yêu cầu không hợp lệ.' }, 403);
      const collection = await getTransactions();
      const scope = admin ? {} : { ownerId: user.ownerId };
      if (method === 'GET') {
        const rows = await collection.find(scope).sort({ date: -1, _id: -1 }).toArray();
        const users = admin ? await (await getUsers()).find({}, { projection: { ownerId: 1, name: 1, email: 1 } }).toArray() : [];
        const names = new Map(users.map(item => [item.ownerId, item]));
        return json({ mode: 'mongo', transactions: rows.map(row => ({ id: row._id.toHexString(), title: row.title, amount: row.amount, type: row.type, category: row.category, date: row.date, wallet: row.wallet, note: row.note, ...(admin ? { ownerId: row.ownerId || '', ownerName: names.get(row.ownerId)?.name || 'Dữ liệu cũ chưa có chủ sở hữu', ownerEmail: names.get(row.ownerId)?.email || '' } : {}) })) });
      }
      if (method === 'DELETE') {
        const id = new URL(request.url).searchParams.get('id');
        if (!id || !/^[a-f0-9]{24}$/i.test(id)) return json({ error: 'ID không hợp lệ.' }, 400);
        const result = await collection.deleteOne({ _id: new ObjectId(id), ...scope });
        if (!result.deletedCount) return json({ error: 'Giao dịch không tồn tại.' }, 404);
        return json({ ok: true });
      }
      let body;
      try { body = await request.json(); } catch { return json({ error: 'JSON không hợp lệ.' }, 400); }
      const parsed = transactionSchema.safeParse(body);
      if (!parsed.success) return json({ error: 'Thông tin giao dịch không hợp lệ.' }, 400);
      if (method === 'PATCH') {
        if (typeof body?.id !== 'string' || !/^[a-f0-9]{24}$/i.test(body.id)) return json({ error: 'ID không hợp lệ.' }, 400);
        const result = await collection.updateOne({ _id: new ObjectId(body.id), ...scope }, { $set: { ...parsed.data, updatedAt: new Date() } });
        if (!result.matchedCount) return json({ error: 'Giao dịch không tồn tại.' }, 404);
        return json({ ...parsed.data, id: body.id });
      }
      const result = await collection.insertOne({ ...parsed.data, ownerId: user.ownerId, createdAt: new Date() });
      return json({ ...parsed.data, id: result.insertedId.toHexString() }, 201);
    } catch { return json({ error: 'Không thể xử lý dữ liệu. Kiểm tra kết nối và thử lại.' }, 503); }
  }
  return { GET: (request: Request) => handle(request, 'GET'), POST: (request: Request) => handle(request, 'POST'), PATCH: (request: Request) => handle(request, 'PATCH'), DELETE: (request: Request) => handle(request, 'DELETE') };
}
