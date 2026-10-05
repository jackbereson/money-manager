import { ObjectId } from 'mongodb';
import { currentUser, invalidOrigin, privateJson as json } from './access';
import { getDb, getUsers } from './mongodb';
import { planSchema, type PlanInput } from './plans';
let indexPromise: Promise<string> | undefined;
export function planHandlers(admin = false) {
  async function handle(request: Request, method: 'GET' | 'POST' | 'PATCH' | 'DELETE') {
    try {
      const user = await currentUser();
      if (!user) return json({ error: 'Vui lòng đăng nhập.' }, 401);
      if (admin && user.role !== 'admin') return json({ error: 'Bạn không có quyền quản trị.' }, 403);
      if (method !== 'GET' && invalidOrigin(request)) return json({ error: 'Yêu cầu không hợp lệ.' }, 403);
      const collection = (await getDb()).collection<PlanInput & { ownerId: string; createdAt: Date; updatedAt?: Date }>('plans');
      indexPromise ??= collection.createIndex({ ownerId: 1, kind: 1 }).catch(error => { indexPromise = undefined; throw error; });
      await indexPromise;
      const scope = admin ? {} : { ownerId: user.ownerId };
      if (method === 'GET') {
        const rows = await collection.find(scope).sort({ _id: -1 }).toArray();
        const users = admin ? await (await getUsers()).find().toArray() : [];
        const owners = new Map(users.map(row => [row.ownerId, row]));
        return json({ plans: rows.map(row => ({ id: row._id.toHexString(), name: row.name, target: row.target, kind: row.kind, ...(row.kind === 'budget' ? { month: row.month, category: row.category } : { saved: row.saved }), ...(admin ? { ownerId: row.ownerId, ownerName: owners.get(row.ownerId)?.name || 'Không xác định', ownerEmail: owners.get(row.ownerId)?.email || '' } : {}) })) });
      }
      if (method === 'DELETE') {
        const id = new URL(request.url).searchParams.get('id');
        if (!id || !/^[a-f0-9]{24}$/i.test(id)) return json({ error: 'ID không hợp lệ.' }, 400);
        const result = await collection.deleteOne({ _id: new ObjectId(id), ...scope });
        return result.deletedCount ? json({ ok: true }) : json({ error: 'Kế hoạch không tồn tại.' }, 404);
      }
      let body;
      try { body = await request.json(); } catch { return json({ error: 'JSON không hợp lệ.' }, 400); }
      const parsed = planSchema.safeParse(body);
      if (!parsed.success) return json({ error: 'Thông tin kế hoạch không hợp lệ.' }, 400);
      if (method === 'PATCH') {
        if (typeof body.id !== 'string' || !/^[a-f0-9]{24}$/i.test(body.id)) return json({ error: 'ID không hợp lệ.' }, 400);
        const result = await collection.updateOne({ _id: new ObjectId(body.id), kind: parsed.data.kind, ...scope }, { $set: { ...parsed.data, updatedAt: new Date() } });
        return result.matchedCount ? json({ ...parsed.data, id: body.id }) : json({ error: 'Kế hoạch không tồn tại.' }, 404);
      }
      const result = await collection.insertOne({ ...parsed.data, ownerId: user.ownerId, createdAt: new Date() });
      return json({ ...parsed.data, id: result.insertedId.toHexString() }, 201);
    } catch { return json({ error: 'Không thể xử lý kế hoạch. Vui lòng thử lại.' }, 503); }
  }
  return { GET: (request: Request) => handle(request, 'GET'), POST: (request: Request) => handle(request, 'POST'), PATCH: (request: Request) => handle(request, 'PATCH'), DELETE: (request: Request) => handle(request, 'DELETE') };
}
