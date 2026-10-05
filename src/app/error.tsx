'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className="min-h-screen grid place-items-center p-6"><div className="card bg-base-100 border border-base-300 max-w-md"><div className="card-body"><h2>Chưa thể tải không gian của bạn</h2><p className="text-sm text-base-content/60 my-4">Kết nối đang gặp sự cố. Vui lòng thử lại sau ít phút.</p><button className="btn btn-primary" onClick={reset}>Thử lại</button></div></div></div>;
}
