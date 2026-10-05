import { z } from 'zod';

export const categories = ['Ăn uống', 'Mua sắm', 'Di chuyển', 'Nhà cửa', 'Giải trí', 'Sức khỏe', 'Lương', 'Đầu tư', 'Khác'] as const;
export const transactionSchema = z.object({
  title: z.string().trim().min(1, 'Nhập nội dung giao dịch').max(120),
  amount: z.number().int().positive().max(1_000_000_000_000),
  type: z.enum(['income', 'expense']),
  category: z.enum(categories),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const parsed = new Date(value + 'T00:00:00Z');
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Ngày không hợp lệ'),
  wallet: z.enum(['Tài khoản ngân hàng', 'Tiền mặt', 'Ví điện tử']),
  note: z.string().trim().max(500).default(''),
});
export type TransactionInput = z.infer<typeof transactionSchema>;
export type Transaction = TransactionInput & { id: string };
export const money = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);
export const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
export function demoTransactions(): Transaction[] {
  const month = today().slice(0, 7);
  const rows: [string, number, TransactionInput['type'], TransactionInput['category'], number, TransactionInput['wallet']][] = [
    ['Lương tháng này', 25000000, 'income', 'Lương', 1, 'Tài khoản ngân hàng'],
    ['Tiền thuê nhà', 4500000, 'expense', 'Nhà cửa', 2, 'Tài khoản ngân hàng'],
    ['Đi chợ đầu tháng', 650000, 'expense', 'Ăn uống', 2, 'Tiền mặt'],
    ['Cà phê cùng bạn bè', 85000, 'expense', 'Ăn uống', 3, 'Ví điện tử'],
    ['Mua sách mới', 320000, 'expense', 'Mua sắm', 3, 'Tài khoản ngân hàng'],
    ['Lợi nhuận đầu tư', 1800000, 'income', 'Đầu tư', 4, 'Tài khoản ngân hàng'],
    ['Đổ xăng', 120000, 'expense', 'Di chuyển', 4, 'Tiền mặt'],
    ['Ăn trưa văn phòng', 65000, 'expense', 'Ăn uống', 5, 'Ví điện tử'],
    ['Vé xem phim', 180000, 'expense', 'Giải trí', 5, 'Ví điện tử'],
  ];
  return rows.map(([title, amount, type, category, day, wallet], i) => ({ id: `demo-${i}`, title, amount, type, category, date: `${month}-${String(day).padStart(2, '0')}`, wallet, note: '' }));
}
