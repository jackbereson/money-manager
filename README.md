# Sổ Thu Chi · Money Quest

Frontend Next.js + TypeScript + Tailwind CSS + DaisyUI trên Cloudflare Static Assets. Backend NestJS + TypeScript trên Render, MongoDB Atlas và Google SSO.

## Hai source riêng trong cùng repository

- `webapp/`: giao diện, public assets, Next.js static export, cấu hình Cloudflare. Output `webapp/out/`.
- `core/`: NestJS API, authentication, phân quyền, MongoDB. Có package và lockfile riêng; không phụ thuộc Next.js hoặc frontend.
- `scripts/`: build, kiểm tra bảo mật, integration và deployment verification.

```text
Browser → Cloudflare HTTPS
             ├─ /, /login, /admin, /_next → static webapp
             └─ /api → gateway → Render core → MongoDB Atlas Singapore
```

Web: https://money-manager.jackbereson.workers.dev

Render chỉ phục vụ API; `/`, `/login`, `/admin` và static assets trả 404. Cloudflare gateway chỉ chuyển `/api` đến backend cố định, giúp cookie đăng nhập cùng domain với giao diện. Không dùng OpenNext hay Next.js server trên Cloudflare.

## CI/CD từ GitHub Actions

Workflow `.github/workflows/ci-cd.yml` chạy khi push `main`, pull request hoặc manual dispatch.

1. CI chạy lint, typecheck, production dependency audit, build hai app, kiểm tra artifact không chứa secrets/source maps, proxy tests và integration với MongoDB test riêng.
2. Sau CI thành công, job frontend deploy `webapp/out/` và gateway lên Cloudflare.
3. Sau CI thành công, job backend gọi Render deploy hook với SHA chính xác của commit đã kiểm tra.
4. Job backend chờ `/health` trả đúng revision, `/ready` xác nhận MongoDB, và kiểm tra các URL frontend/source trả 404. Deploy lỗi làm workflow thất bại.

Pull request chỉ chạy CI. Runtime secrets Google/MongoDB chỉ nằm trên Render, không cần đưa vào GitHub hay frontend build. Auto-Deploy Render đặt **Off**; GitHub Actions điều phối deployment.

GitHub repository secrets: `CLOUDFLARE_API_TOKEN`, `RENDER_DEPLOY_HOOK`.
Repository variable: `CLOUDFLARE_ACCOUNT_ID`.

Render service settings (`render.yaml`):

- Repository `jackbereson/money-manager`, branch `main`, root directory **core**.
- Build `npm ci && npm run build`; start `npm start`; Node 24.
- Auto-Deploy **Off**; health check `/health`.
- Runtime environment: `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_URL`, `AUTH_ADMIN_EMAILS`, `MONGODB_URI`, `MONGODB_DB`.
- `AUTH_URL=https://money-manager.jackbereson.workers.dev`.
- Google redirect `https://money-manager.jackbereson.workers.dev/api/auth/callback/google`.

Atlas chỉ cho phép outbound CIDR của Render service: `74.220.52.0/24`, `74.220.60.0/24`; không mở `0.0.0.0/0`. `/ready` trả 503 nếu database chưa sẵn sàng, không trả credentials. Render Free có thể ngủ khi không có traffic.

## Chạy và kiểm tra local

```powershell
npm ci
npm --prefix core ci
docker compose up -d
Copy-Item core/.env.example core/.env
# Điền credentials local, AUTH_SECRET và MongoDB.
npm run build:all
npm start
```

API local ở `http://localhost:3200`. `npm run backend:dev` reload API. `npm run dev:ui` xem giao diện Next.js development; backend không phục vụ giao diện. Production truy cập qua Cloudflare gateway.

```powershell
npm run lint
npm run typecheck
npm run build:all
node scripts/artifact-security-test.mjs
node scripts/frontend-proxy-test.mjs
npm run test:integration
```

Integration dùng database `_test`, kiểm tra owner isolation, CRUD, role/blocking, forged/expired JWT, CSRF, PKCE/state, logout revocation và API-only routes. Google SSO thật cần OAuth client và callback đã đăng ký.

## Authentication và bảo mật

Google OAuth dùng verified email, PKCE, state, CSRF. Session JWT mã hóa JWE, cookie HttpOnly/Secure/SameSite=Lax; không lưu token trong localStorage. MongoDB session có TTL 7 ngày; backend kiểm tra session, user và role mỗi request. Logout thu hồi session; khóa user/đổi role có hiệu lực ngay.

Member chỉ xem và sửa dữ liệu cá nhân; owner lấy từ session. Admin quản trị user/dữ liệu hệ thống và dùng dashboard cá nhân. `AUTH_ADMIN_EMAILS=jackbereson@gmail.com` cấp admin cho email Google đã xác minh.

Dotenv thật, `key`, deploy hook và build directories đều bị Git ignore. Chỉ static artifacts được upload Cloudflare; build chặn credentials, dotenv, symlink và source maps. HTML/JS/CSS của giao diện phải tải xuống trình duyệt để chạy; bí mật và quyền truy cập được bảo vệ ở backend.
