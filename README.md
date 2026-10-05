# Sổ Thu Chi · Money Quest

Frontend Next.js 16 + React + TypeScript + Tailwind CSS + DaisyUI, **static export / client-side rendering trên Cloudflare**. Backend NestJS 11 + TypeScript trên Render + MongoDB + Google SSO. Không dùng OpenNext hay Next.js server trên Cloudflare.

## Kiến trúc

```text
Browser → Cloudflare HTTPS
             ├─ /, /login, /admin, /_next: static Next.js (out/)
             └─ /api: proxy → Render NestJS → MongoDB Atlas Free, Singapore
```

`src/` chứa frontend, `backend/src/` chứa API, authentication và quyền dữ liệu. Cloudflare phục vụ `out/`; gateway nhỏ chỉ chuyển `/api` sang Render để cookie cùng domain với giao diện. Tất cả logic, Google credentials, AUTH_SECRET và MongoDB nằm trên Render. Trang admin có thể tải giao diện công khai; dữ liệu và mọi thao tác chỉ được backend cho phép sau xác thực.

Web: https://money-manager.jackbereson.workers.dev. Backend: https://money-manager-ehqs.onrender.com. Trên Render đặt AUTH_URL=https://money-manager.jackbereson.workers.dev; callback Google là AUTH_URL + /api/auth/callback/google. GitHub Actions deploy frontend sau khi verify thành công. `wrangler.jsonc` chỉ upload static export và gateway; không upload backend hoặc dotenv.

## Chạy local

```powershell
npm ci
npm --prefix backend ci
docker compose up -d
Copy-Item backend/.env.example backend/.env
# Điền Google credentials và AUTH_SECRET ngẫu nhiên ít nhất 32 ký tự.
npm run build:all
npm start
```

Mặc định http://localhost:3200. Google OAuth redirect: `http://localhost:3200/api/auth/callback/google`. `AUTH_URL` phải khớp domain/cổng đang dùng. Sửa frontend: build lại; `npm run dev:ui` chỉ xem UI, không cung cấp API. Backend reload với `npm run backend:dev`. MongoDB local chỉ mở trên 127.0.0.1:27019. `.env`, `backend/.env`, `key` đều bị Git ignore.

## Authentication và quyền

- Google OAuth: chỉ `openid email profile`, verified email, PKCE + state và chống CSRF.
- Session là JWT **mã hóa JWE** của Auth.js, cookie HttpOnly, Secure trên HTTPS, SameSite=Lax; không lưu token trong localStorage/sessionStorage.
- Auth.js dùng HKDF với secret và salt tên cookie để tạo khóa mã hóa. App không nhận/lưu mật khẩu vì dùng Google SSO; không thêm hash/salt/pepper mật khẩu giả.
- Session có ID ngẫu nhiên và record MongoDB với TTL 7 ngày. Backend kiểm tra session, trạng thái user và role ở mỗi request. Logout thu hồi session, kể cả bản sao JWT; khóa user/đổi role có hiệu lực ngay.
- Member CRUD và xuất dữ liệu cá nhân; ownerId lấy từ session, bỏ qua owner/role giả trong payload. Admin quản trị mọi user/giao dịch/kế hoạch và có dashboard cá nhân riêng.
- `AUTH_ADMIN_EMAILS=jackbereson@gmail.com` cấp admin cho email Google đã xác minh; admin không tự khóa/hạ quyền tài khoản đang dùng.
- Validate payload, mutation kiểm tra Origin, giới hạn request body 256 KB, rate limit 300 request/phút/IP qua Render proxy.
- Chỉ `out/` được phục vụ công khai. Build chặn secret/env/source map/symlink trong static artifacts. Không serve source, backend/dist, dotenv hoặc Git.

## Deploy Render Free, Singapore

`render.yaml` mô tả một Web Service miễn phí. Trong Dashboard:

- Repo: jackbereson/money-manager, branch main; root directory để trống.
- Build: `npm ci && npm --prefix backend ci && npm run build:all`.
- Start: `npm --prefix backend start`; Node 24; health check `/health`.
- Secrets runtime: AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_URL, AUTH_ADMIN_EMAILS, MONGODB_URI, MONGODB_DB. Không commit giá trị thật.
- Google redirect: `<AUTH_URL>/api/auth/callback/google` và origin tương ứng.
- Connect → Outbound: lấy các CIDR của chính service, thêm vào Atlas Network Access. Không dùng IP của domain inbound hoặc 0.0.0.0/0. Render dùng chung các dải IP theo vùng, nên xác thực MongoDB vẫn bắt buộc.
- `/health`: tiến trình đang chạy. `/ready`: kiểm tra kết nối MongoDB, 503 nếu chưa sẵn sàng; không trả lỗi chứa credentials.
- GitHub CI chạy lint/typecheck, production dependency audit, build cả hai app, chống secret artifacts, và integration permissions. Render Blueprint/Git integration có thể auto-deploy sau checksPass; public repo deploy qua deploy hook sau CI.

Render Free ngủ sau 15 phút không có traffic; lần gọi tiếp theo có thể mất khoảng một phút. Dữ liệu lưu Atlas, không dùng filesystem Render để lưu giao dịch.

## Kiểm tra

```powershell
npm run lint
npm run typecheck
npm run build:all
node scripts/artifact-security-test.mjs
npm run test:integration
```

Integration dùng database `_test` và session tổng hợp, không có endpoint login test trong ứng dụng. Kiểm tra isolation/CRUD, roles/blocking, forged/expired JWT, CSRF, PKCE/state, logout revocation và private file URLs. Kiểm tra Google SSO thật cần callback đã đăng ký và credentials runtime.
