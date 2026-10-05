'use client';

import { ArrowRight, CloudOff, House, RefreshCw, Search, Sparkles, Sprout, TrendingUp, Wallet } from 'lucide-react';
import Link from 'next/link';

type StatusScreenProps = {
  variant: 'loading' | 'not-found' | 'error';
  onRetry?: () => void;
  compact?: boolean;
  message?: string;
};

const content = {
  loading: { label: 'MỘT CHÚT NỮA THÔI', title: 'Đang mở sổ của bạn…', description: 'Một chút chờ đợi, một bước gần hơn đến mục tiêu tài chính.', note: 'Mỗi đồng đều có ý nghĩa.' },
  'not-found': { label: '404 · ĐI LẠC MỘT CHÚT', title: 'Trang này chưa có trong sổ', description: 'Có thể đường dẫn đã thay đổi hoặc trang bạn tìm không còn ở đây. Về trang chủ để tiếp tục nhé.', note: 'Một ngã rẽ nhỏ trên hành trình lớn.' },
  error: { label: '500 · TẠM DỪNG MỘT NHỊP', title: 'Sổ thu chi cần nghỉ một chút', description: 'Hiện chưa thể tải trang này. Bạn có thể thử lại sau một lát hoặc quay về trang chủ.', note: 'Hẹn bạn trở lại hành trình tài chính.' },
};

export default function StatusScreen({ variant, onRetry, compact = false, message }: StatusScreenProps) {
  const copy = content[variant];
  const loading = variant === 'loading';
  const Icon = loading ? Wallet : variant === 'not-found' ? Search : CloudOff;

  return <section className={`status-screen status-screen--${variant}${compact ? ' status-screen--compact' : ''}`} aria-label={loading ? 'Đang tải' : variant === 'not-found' ? 'Không tìm thấy trang' : 'Không thể tải trang'}>
    {!compact && <header className="status-header">
      <Link prefetch={false} href="/" className="brand" aria-label="Sổ Thu Chi · Trang chủ"><span className="brand-mark"><Sprout size={25} /></span><span>Sổ Thu Chi<span className="brand-sub">MỖI ĐỒNG ĐỀU CÓ Ý NGHĨA</span></span></Link>
      <span className="status-header-note"><Sparkles size={15} />Money Quest</span>
    </header>}
    <div className="status-content">
      <div className="status-art" aria-hidden="true">
        <div className="status-orbit" />
        <span className="status-float status-float--cyan"><TrendingUp size={25} /></span>
        <span className="status-float status-float--pink"><Sparkles size={24} /></span>
        <span className="status-art-dot" />
        {loading ? <div className="status-wallet"><Icon size={64} strokeWidth={1.5} /><span className="status-wallet-spark"><Sprout size={22} /></span></div> : <div className="status-code"><span>{variant === 'not-found' ? '4' : '5'}</span><span className="status-zero"><Icon size={42} strokeWidth={1.6} /></span><span>{variant === 'not-found' ? '4' : '0'}</span></div>}
        <span className="status-art-caption">{loading ? 'ĐANG CHUẨN BỊ KHÔNG GIAN CỦA BẠN' : 'SỔ THU CHI · MONEY QUEST'}</span>
      </div>
      <div className="status-copy" role={loading ? 'status' : undefined}>
        <span className="status-label">{copy.label}</span>
        <h1>{loading && message ? message : copy.title}</h1>
        <p>{copy.description}</p>
        {loading ? <div className="status-loading-track" aria-hidden="true"><span /></div> : <nav className="status-actions" aria-label="Điều hướng khôi phục">
          {variant === 'error' && <button type="button" className="status-button status-button--primary" onClick={onRetry ?? (() => window.location.reload())}><RefreshCw size={17} />Thử lại</button>}
          <Link prefetch={false} className={`status-button status-button--${variant === 'not-found' ? 'primary' : 'secondary'}`} href="/"><House size={17} />Về trang chủ{variant === 'not-found' && <ArrowRight size={17} />}</Link>
        </nav>}
      </div>
      {loading && !compact && <div className="status-preview" aria-hidden="true"><span /><span /><span /></div>}
    </div>
    {!compact && <footer className="status-footer"><Sprout size={14} />{copy.note}</footer>}
  </section>;
}
