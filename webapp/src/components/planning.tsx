'use client';
import { useEffect, useRef, useState } from 'react';
import { Plus, Target, Wallet, Pencil, Trash2, X, Check, LoaderCircle, Sparkles } from 'lucide-react';
import AnimatedIcon from './animated-icon';
import { categories, money, today, type Transaction } from '@/lib/transactions';
import { planSchema, type Plan, type PlanInput } from '@/lib/plans';

export default function Planning({ transactions, month, admin = false }: { transactions: (Transaction & { ownerId?: string })[]; month: string; admin?: boolean }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'budget' | 'goal'>('budget');
  const [form, setForm] = useState<PlanInput | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Plan | null>(null);
  const formDialog = useRef<HTMLDialogElement>(null);
  const deleteDialog = useRef<HTMLDialogElement>(null);
  const endpoint = admin ? '/api/admin/plans' : '/api/plans';
  useEffect(() => {
    let active = true;
    fetch(endpoint, { cache: 'no-store' }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); if (active) setPlans(data.plans); }).catch(reason => { if (active) setError(reason.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [endpoint]);
  useEffect(() => { if (form) formDialog.current?.showModal(); else formDialog.current?.close(); }, [form]);
  useEffect(() => { if (deleting) deleteDialog.current?.showModal(); else deleteDialog.current?.close(); }, [deleting]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timer); }, [toast]);
  const visible = plans.filter(plan => plan.kind === tab && (admin || plan.kind === 'goal' || plan.month === month));
  const expenseFor = (plan: Plan) => plan.kind === 'budget' ? transactions.filter(row => row.type === 'expense' && row.category === plan.category && row.date.startsWith(plan.month) && (!admin || row.ownerId === plan.ownerId)).reduce((sum, row) => sum + row.amount, 0) : plan.saved;
  function open(plan?: Plan) {
    setError(''); setEditId(plan?.id || null);
    setForm(plan || (tab === 'budget' ? { kind: 'budget', name: '', target: 0, month: month || today().slice(0, 7), category: 'Ăn uống' } : { kind: 'goal', name: '', target: 0, saved: 0 }));
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); const parsed = planSchema.safeParse(form);
    if (!parsed.success) { setError('Nhập đầy đủ tên, số tiền nguyên dương và các thông tin bắt buộc.'); return; }
    setBusy(true); setError('');
    try {
      const response = await fetch(endpoint, { method: editId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...parsed.data, ...(editId ? { id: editId } : {}) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setPlans(editId ? plans.map(plan => plan.id === editId ? { ...plan, ...result } : plan) : [...plans, result]); setForm(null); setToast('Đã lưu kế hoạch');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể lưu kế hoạch.'); } finally { setBusy(false); }
  }
  async function remove() {
    if (!deleting) return; setBusy(true); setError('');
    try {
      const response = await fetch(`${endpoint}?id=${deleting.id}`, { method: 'DELETE' }); if (!response.ok) throw new Error((await response.json()).error);
      setPlans(plans.filter(plan => plan.id !== deleting.id)); setDeleting(null); setToast('Đã xóa kế hoạch');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể xóa kế hoạch.'); } finally { setBusy(false); }
  }
  return <section className="planning-section"><div className="planning-heading"><div><h2>Breakdown & Budget</h2><p>Đặt giới hạn nhỏ. Chạm mục tiêu lớn.</p></div>{!admin && <button className="btn btn-primary btn-sm" disabled={loading} onClick={() => open()}><Plus size={15} />{tab === 'budget' ? 'Ngân sách' : 'Mục tiêu'}</button>}</div><div className="tabs tabs-box planning-tabs" role="tablist"><button role="tab" aria-selected={tab === 'budget'} className={`tab ${tab === 'budget' ? 'tab-active' : ''}`} onClick={() => setTab('budget')}><Wallet size={14} />Ngân sách</button><button role="tab" aria-selected={tab === 'goal'} className={`tab ${tab === 'goal' ? 'tab-active' : ''}`} onClick={() => setTab('goal')}><Target size={14} />Mục tiêu</button></div>
    {error && !form && !deleting && <div className="alert alert-error alert-soft text-xs my-4" role="alert">{error}</div>}
    {loading ? <div className="loading-state"><LoaderCircle className="animate-spin" size={20} />Đang tải kế hoạch…</div> : <><div className="plans-grid">{visible.map(plan => { const current = expenseFor(plan); const ratio = current / plan.target * 100; return <article className="card plan-card" key={plan.id}><div className="plan-card-top"><span className={`plan-symbol ${plan.kind}`} >{plan.kind === 'budget' ? <AnimatedIcon name="save-money" size={32} fallback={Wallet} /> : <AnimatedIcon name="target" size={32} fallback={Target} />}</span><div><h3>{plan.name}</h3><small>{plan.kind === 'budget' ? `${plan.category} · ${plan.month}` : 'Mục tiêu tiết kiệm'}</small></div><span className={`badge badge-soft ${plan.kind === 'budget' && ratio > 100 ? 'badge-error' : 'badge-primary'}`}>{Math.round(ratio)}%</span></div>{admin && <p className="plan-owner">{plan.ownerName} · {plan.ownerEmail}</p>}<div className={`plan-amount ${plan.kind}`}><strong>{money(current)}</strong><span>/ {money(plan.target)}</span></div><progress className={`progress ${plan.kind === 'budget' && ratio > 100 ? 'progress-error' : 'progress-primary'}`} value={Math.min(current, plan.target)} max={plan.target} /><div className="plan-caption"><span>{plan.kind === 'budget' ? (current > plan.target ? `Vượt ${money(current - plan.target)}` : `Còn ${money(plan.target - current)}`) : current >= plan.target ? 'Đã chạm mục tiêu ✦' : `Còn ${money(plan.target - current)} đến đích`}</span><div><button aria-label={`Sửa kế hoạch ${plan.name}`} onClick={() => open(plan)}><Pencil size={14} /></button><button aria-label={`Xóa kế hoạch ${plan.name}`} onClick={() => { setError(''); setDeleting(plan); }}><Trash2 size={14} /></button></div></div></article>; })}</div>{!visible.length && <div className="planning-empty card"><AnimatedIcon name={tab === "budget" ? "save-money" : "target"} size={56} fallback={Sparkles} /><h3>{tab === 'budget' ? 'Cho mỗi khoản chi một giới hạn' : 'Dành dụm cho điều bạn yêu'}</h3><p>{tab === 'budget' ? 'Chưa có ngân sách trong tháng này. Mức chi được tự tính từ giao dịch theo danh mục.' : 'Tạo mục tiêu và cập nhật số tiền đã dành dụm theo thực tế.'}</p>{!admin && <button className="btn btn-outline btn-sm" onClick={() => open()}><Plus size={14} />Bắt đầu kế hoạch</button>}</div>}<div className="plan-explainer">{tab === 'budget' ? 'Ngân sách theo dõi khoản chi hiện có, không tạo thêm giao dịch. Mỗi ngân sách độc lập theo danh mục và tháng.' : 'Tiến trình mục tiêu là số tiền bạn tự cập nhật, không trừ số dư và không tự tạo giao dịch.'}</div></>}
    <dialog ref={formDialog} className="modal planning-modal" onCancel={event => { if (busy) event.preventDefault(); }} onClose={() => setForm(null)}><form className="modal-box" onSubmit={save}>{form && <><div className="flex justify-between items-center"><h2>{editId ? 'Sửa' : 'Thêm'} {form.kind === 'budget' ? 'ngân sách' : 'mục tiêu'}</h2><button className="btn btn-ghost btn-circle btn-sm" type="button" disabled={busy} aria-label="Đóng" onClick={() => setForm(null)}><X size={18} /></button></div><label className="fieldset"><span className="fieldset-legend">Tên kế hoạch</span><input className="input w-full" required maxLength={100} placeholder={form.kind === 'budget' ? 'Ví dụ: Ăn uống trong tháng' : 'Ví dụ: Chuyến đi Đà Lạt'} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label className="fieldset"><span className="fieldset-legend">{form.kind === 'budget' ? 'Giới hạn chi' : 'Số tiền mục tiêu'} (VND)</span><input className="input w-full" required type="number" min={1} max={1000000000000} step={1} value={form.target || ''} onChange={e => setForm({ ...form, target: Number(e.target.value) })} /></label>{form.kind === 'budget' ? <div className="grid grid-cols-2 gap-3"><label className="fieldset"><span className="fieldset-legend">Danh mục</span><select className="select w-full" value={form.category} onChange={e => setForm({ ...form, category: e.target.value as typeof form.category })}>{categories.map(category => <option key={category}>{category}</option>)}</select></label><label className="fieldset"><span className="fieldset-legend">Tháng</span><input className="input w-full" type="month" required value={form.month} onChange={e => setForm({ ...form, month: e.target.value })} /></label></div> : <label className="fieldset"><span className="fieldset-legend">Đã tiết kiệm (VND)</span><input className="input w-full" type="number" min={0} max={1000000000000} step={1} required value={form.saved} onChange={e => setForm({ ...form, saved: Number(e.target.value) })} /></label>}{error && <div className="alert alert-error alert-soft text-xs mt-3" role="alert">{error}</div>}<div className="modal-action"><button className="btn btn-ghost" type="button" disabled={busy} onClick={() => setForm(null)}>Hủy</button><button className="btn btn-primary" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" size={16} /> : <Check size={16} />}Lưu kế hoạch</button></div></>}</form></dialog>
    <dialog ref={deleteDialog} className="modal planning-modal" onCancel={event => { if (busy) event.preventDefault(); }} onClose={() => setDeleting(null)}><div className="modal-box"><h2>Xóa kế hoạch này?</h2><p className="text-sm text-base-content/60 mt-4">{deleting?.name}<br />Giao dịch thu chi sẽ được giữ nguyên.</p>{error && <div className="alert alert-error alert-soft mt-4 text-xs" role="alert">{error}</div>}<div className="modal-action"><button className="btn btn-ghost" disabled={busy} onClick={() => setDeleting(null)}>Giữ lại</button><button className="btn btn-error" disabled={busy} onClick={remove}>{busy ? 'Đang xóa…' : 'Xóa kế hoạch'}</button></div></div></dialog>
    {toast && <div className="toast-message" role="status"><Check size={16} />{toast}</div>}
  </section>;
}
