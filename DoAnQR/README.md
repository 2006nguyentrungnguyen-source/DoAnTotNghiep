# QR Cafe – Ứng dụng gọi món bằng QR cho quán cà phê

Đồ án nhóm 2 người, 10 tuần (02/11/2026 → 08/01/2027). Kế hoạch chi tiết: file Excel `Ke_hoach_do_an_QR_cafe`.

| Thư mục | Nội dung | Phụ trách |
|---|---|---|
| `backend/` | Node.js (Express 5) + MongoDB (Mongoose) + JWT | A |
| `frontend/` | React (Vite) + Tailwind – *chưa bắt đầu* | B |
| `docs/` | Phân tích kế hoạch, ghi chú thiết kế | A + B |

## Chạy backend

```bash
cd backend
cp .env.example .env        # điền MONGODB_URI và 2 JWT secret
npm install
npm run seed                # nạp 3 tài khoản, 20 món, 10 bàn mẫu
npm run dev                 # http://localhost:5000/api/health
npm test                    # 20 test, không cần MongoDB
```

Docker: `docker compose up --build` (thêm `--profile local-db` nếu muốn Mongo cục bộ thay vì Atlas).

## Tiến độ backend so với kế hoạch

| Tuần | Nội dung | Trạng thái |
|---|---|---|
| 1 | Repo, `/api/health`, Docker | Xong |
| 3 | Auth JWT, RBAC, CRUD danh mục/món/size/topping, upload ảnh, nhân viên | Xong (cần chạy thử với DB thật) |
| 4 | Bàn + token, QR PNG/SVG, menu công khai, tạo đơn (giá snapshot) | Xong (cần chạy thử với DB thật) |
| 5 | Gọi thêm món, xem đơn của bàn, rate limit | Xong (cần chạy thử với DB thật) |
| 6 | Socket.IO, đổi trạng thái realtime | `PATCH /orders/:id/status` đã có, **chưa có Socket.IO** |
| 7+ | Gọi nhân viên, thanh toán, hủy món, thống kê, xuất Excel | Chưa làm |

## API đã có

Tất cả trả `{ success, data | message, errors? }`. Header `Authorization: Bearer <accessToken>` cho nhóm cần đăng nhập.

| Nhóm | Endpoint | Quyền |
|---|---|---|
| Auth | `POST /api/auth/login` · `POST /api/auth/refresh` · `GET /api/auth/me` | công khai / đăng nhập |
| Nhân viên | `GET,POST /api/staff` · `PUT,DELETE /api/staff/:id` (DELETE = khóa) | owner |
| Danh mục | `GET` (đăng nhập) · `POST, PUT /:id, DELETE /:id` (owner) – `/api/categories` | owner/staff |
| Món | `/api/products` CRUD · `PATCH /:id/availability` (staff được) · `POST /:id/image` · `POST,PUT,DELETE /:id/options[/:optionId]` | owner (+staff đọc, báo hết món) |
| Bàn | `/api/tables` CRUD · `POST /:id/regenerate-token` · `GET /:id/qr?format=png\|svg&size=512` | owner |
| Khách | `GET /api/public/menu?token=` · `POST /api/public/orders` · `POST /api/public/orders/:id/items` · `GET /api/public/orders?token=` | token bàn |
| Đơn | `GET /api/orders` (lọc status/table/from/to, phân trang) · `GET /:id` · `PATCH /:id/status` | staff, owner |

QR của bàn trỏ tới `${CLIENT_URL}/order?token=<token>`; frontend đọc `token` rồi gọi `/api/public/menu?token=`.
Gửi đơn: `{ "token": "...", "items": [{ "productId": "...", "quantity": 2, "sizeId": "...", "toppingIds": ["..."], "note": "ít đá" }] }` – **không gửi giá**, server tự tính.

## Quyết định thiết kế đáng chú ý

- **MongoDB thay vì PostgreSQL** (repo ban đầu đã dùng Mongoose + Atlas). Bảng `roles` gộp thành `users.role`; `product_options` nhúng vào món; `order_items` nhúng vào đơn. Snapshot tên/giá vẫn giữ nguyên (FR-35).
- Token bàn 48 ký tự hex ngẫu nhiên (24 byte `crypto.randomBytes`); token không bao giờ xuất hiện trong response của API quản trị thông thường, chỉ nằm trong QR.
- Rate limit đặt đơn tính theo **token bàn** (8 lần/phút), không theo IP, vì nhiều khách dùng chung wifi quán.
- Mỗi bàn chỉ có tối đa 1 đơn "đang mở" (unique partial index), khách gọi thêm thì thành đợt (`batchNo`) mới.
- Tài khoản bị khóa mất hiệu lực ngay (middleware tra DB mỗi request); đăng nhập sai 5 lần khóa 15 phút.
