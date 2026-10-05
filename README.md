# Sổ Thu Chi · Money Quest

Next.js App Router + TypeScript + Tailwind CSS 4 + DaisyUI 5 + MongoDB + Google OAuth (Auth.js v5).

## Khởi động

```powershell
npm install
docker compose up -d
Copy-Item .env.example .env.local
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
# Điền AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_ADMIN_EMAILS vào .env.local.
npm run dev -- --port 3100
```

Mở http://localhost:3100. MongoDB Docker chỉ mở trên `127.0.0.1:27019`; volume `mongo_data` giữ dữ liệu. Có thể thay `MONGODB_URI` bằng MongoDB Atlas. Không đưa `.env.local` lên Git.

## Google SSO

Trong Google Cloud Console:

1. Tạo/chọn project, thiết lập OAuth consent screen (Google Auth Platform).
2. Tạo OAuth Client ID loại **Web application**.
3. Authorized JavaScript origin: `http://localhost:3100`.
4. Authorized redirect URI: `http://localhost:3100/api/auth/callback/google`.
5. Nếu ứng dụng ở trạng thái Testing, thêm email người thử vào Test users.
6. Điền Client ID/Secret vào `AUTH_GOOGLE_ID` và `AUTH_GOOGLE_SECRET` trong `.env.local`, điền secret ngẫu nhiên vào `AUTH_SECRET`.
7. `AUTH_URL=http://localhost:3100` phải khớp cổng và domain đang truy cập. Khởi động lại Next.js.

Khi triển khai dùng domain HTTPS, đổi AUTH_URL, origin và redirect URI tương ứng. Ứng dụng chỉ yêu cầu `openid email profile`, không truy cập Gmail, Drive hoặc thanh toán. Chỉ nhận tài khoản Google đã xác minh email. Đăng nhập thật chưa thể kiểm tra nếu chưa có OAuth credentials; kiểm tra tự động sử dụng phiên tổng hợp trong database riêng.

Tài liệu: [Auth.js Google](https://authjs.dev/getting-started/providers/google), [DaisyUI Next.js](https://daisyui.com/docs/install/nextjs/).

## Phân quyền và dữ liệu

| Vai trò | Quyền |
| --- | --- |
| Member | Dashboard và CRUD giao dịch, ngân sách, mục tiêu của riêng mình; tìm kiếm/lọc/xuất CSV dữ liệu cá nhân. |
| Admin | Các quyền cá nhân, cộng trang `/admin`: thống kê hệ thống, danh sách người dùng, đổi vai trò, khóa/mở khóa, xem/sửa/xóa giao dịch và kế hoạch toàn hệ thống. |

`AUTH_ADMIN_EMAILS` là danh sách email Google phân cách bằng dấu phẩy: email được cấp admin **khi đăng ký lần đầu**. Cấu hình trước lần đăng nhập đầu tiên. Tài khoản đã tồn tại giữ vai trò hiện tại; admin khác có thể phân quyền qua UI. Admin không được tự khóa/hạ quyền chính tài khoản đang đăng nhập.

Mỗi yêu cầu đọc trạng thái và vai trò từ MongoDB: việc khóa/hạ quyền có hiệu lực ngay với phiên hiện có ở yêu cầu tiếp theo. Khóa giữ lại dữ liệu. Member không xem/sửa/xóa được dữ liệu khác kể cả biết ID; API lấy `ownerId` từ phiên, bỏ qua owner/role do client gửi. Phản hồi dữ liệu dùng `private, no-store`, mutation kiểm tra Origin. Dữ liệu cũ chưa có owner chỉ được admin thấy, không tự gán cho member.

Phiên JWT được Auth.js mã hóa trong cookie HttpOnly. Thời hạn phiên 7 ngày. Không có endpoint đăng nhập giả hoặc cơ chế bỏ qua đăng nhập trong ứng dụng chính. Người dùng chưa đăng nhập được chuyển tới `/login`; chưa có cấu hình Google thì nút đăng nhập hiển thị trạng thái chưa sẵn sàng.

## Giao diện và logic

- Palette theo ảnh tham chiếu: nền lavender nhẹ, card trắng bo tròn, gradient cyan–tím–hồng, biểu đồ cột/ring có vân sọc; thu cyan, chi hồng.
- Desktop: sidebar, dashboard, bảng giao dịch và admin console.
- Mobile dưới 768px: giao dịch dạng list view, thanh điều hướng dưới, thêm thu chi bằng sheet; giao diện đáp ứng theo viewport, không cần đoán user-agent.
- Cấp độ dựa trên số giao dịch hiện có (10 XP/giao dịch, 10 giao dịch/cấp). Xóa giao dịch giảm tiến trình; đây là chỉ báo thói quen, không phải tiền thưởng.
- Số dư tính từ toàn bộ giao dịch. Thu/chi và số tiền còn lại tính theo tháng. Không có số dư ban đầu riêng.
- Biểu đồ thu/chi gồm sáu khoảng ngày trong tháng; phân bổ danh mục có thể chuyển thu/chi. Tất cả số liệu tính từ dữ liệu của user.
- Ngân sách theo danh mục và tháng tự cộng khoản chi tương ứng, báo vượt giới hạn. Các ngân sách độc lập; không sinh giao dịch.
- Mục tiêu tiết kiệm dùng số tiền người dùng tự cập nhật; không tự trừ số dư và không sinh giao dịch.
- CSV UTF-8 BOM xuất giao dịch đang lọc, có xử lý nội dung dễ bị Excel hiểu thành công thức.
- Có manifest web app `display: standalone`, safe area và metadata Apple. Có thể dùng Add to Home Screen tùy trình duyệt; không có cache/offline cho dữ liệu tài chính.

## Kiểm tra

```powershell
npm run lint
npm run typecheck
npm run build
# Cần MongoDB chạy ở cổng 27019, không cần credentials Google thật:
npm run test:integration
```

Integration test tạo server ở cổng 3111 với secret tạm, dùng database `save_billion_test` và xóa chính dữ liệu thử sau khi xong. Có 37 kiểm tra: đăng nhập bắt buộc, owner giả, đọc/sửa/xóa chéo tài khoản, admin/member, khóa/hạ quyền với phiên cũ, kế hoạch riêng, input và Origin. Có thể đặt `MONGODB_TEST_URI`, `MONGODB_TEST_DB` (phải kết thúc `_test`) và `TEST_PORT`.

`node scripts/visual-fixture.mjs` phục vụ kiểm tra giao diện có dữ liệu tổng hợp ở cổng 3112, database test và session test tạm trong `.scratch/ui-session.json`. Đây là script phát triển, không phải endpoint đăng nhập. Tạo `.scratch/stop-visual` để dừng server, xóa fixture và session file. Chỉ chạy khi MongoDB test trên localhost:27019 hoạt động.

## Phần phát triển tiếp theo

- Giao dịch định kỳ với tạo giao dịch theo kỳ có chống trùng.
- Danh mục/ví tùy chỉnh và số dư khởi đầu.
- Audit log cho thao tác admin, phân trang server khi dữ liệu lớn.
- Tích hợp ngân hàng/đầu tư chỉ sau khi có nguồn dữ liệu và quyền truy cập phù hợp; hiện không mô phỏng thẻ thật hay danh mục chứng khoán.
