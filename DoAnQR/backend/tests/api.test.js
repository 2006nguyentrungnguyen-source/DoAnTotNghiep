// Test tầng HTTP: xác thực, RBAC, validate, rate limit. Model được stub nên KHÔNG cần MongoDB.
require("./setup");
const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const bcrypt = require("bcryptjs");

const app = require("../src/app");
const User = require("../src/models/User");
const Table = require("../src/models/Table");
const { signAccess } = require("../src/utils/tokens");

const fakeUser = (role, over = {}) => ({
    _id: "64b0000000000000000000c1", role, isActive: true, toJSON() { return { id: this._id, role }; }, ...over,
});
const asUser = (user) => {
    test.mock.method(User, "findById", async () => user);
    return { Authorization: `Bearer ${signAccess(user)}` };
};

test.afterEach(() => test.mock.restoreAll());

test("health + 404 JSON", async () => {
    await request(app).get("/api/health").expect(503);
    const r = await request(app).get("/api/khong-co").expect(404);
    assert.equal(r.body.success, false);
});

test("API quản trị yêu cầu đăng nhập (401)", async () => {
    for (const p of ["/api/categories", "/api/products", "/api/tables", "/api/staff", "/api/orders", "/api/auth/me"])
        await request(app).get(p).expect(401);
});

test("token rác bị từ chối", async () => {
    await request(app).get("/api/auth/me").set("Authorization", "Bearer abc.def.ghi").expect(401);
});

test("RBAC: nhân viên bị 403 ở khu vực chủ quán (TC-21)", async () => {
    const h = asUser(fakeUser("staff"));
    await request(app).get("/api/staff").set(h).expect(403);
    await request(app).get("/api/tables").set(h).expect(403);
    await request(app).post("/api/categories").set(h).send({ name: "X" }).expect(403);
    await request(app).delete("/api/products/64b0000000000000000000c1").set(h).expect(403);
});

test("tài khoản bị khóa mất hiệu lực ngay dù token còn hạn", async () => {
    const h = asUser(fakeUser("owner", { isActive: false }));
    await request(app).get("/api/auth/me").set(h).expect(401);
});

test("chủ quán qua được RBAC và bị validate dữ liệu (422)", async () => {
    const h = asUser(fakeUser("owner"));
    const r = await request(app).post("/api/categories").set(h).send({ name: "" }).expect(422);
    assert.equal(r.body.errors[0].field, "name");
    await request(app).post("/api/products").set(h).send({ category: "x", name: "A", basePrice: -5 }).expect(422);
    await request(app).post("/api/products").set(h).send({ category: "64b0000000000000000000c1", name: "A", basePrice: 10.5 }).expect(422);
});

test("login: validate đầu vào; sai mật khẩu 5 lần thì khóa (UC-14)", async () => {
    await request(app).post("/api/auth/login").send({}).expect(422);

    const user = {
        passwordHash: await bcrypt.hash("dung", 4), isActive: true, failedLogins: 0, lockUntil: null,
        async save() {}, toJSON() { return {}; },
    };
    test.mock.method(User, "findOne", () => ({ select: async () => user }));
    for (let i = 0; i < 5; i++) await request(app).post("/api/auth/login").send({ username: "a", password: "sai" }).expect(401);
    assert.ok(user.lockUntil > new Date(), "phải bị khóa sau 5 lần sai");
    await request(app).post("/api/auth/login").send({ username: "a", password: "dung" }).expect(423);
});

test("login đúng trả access + refresh token, không lộ passwordHash", async () => {
    const user = {
        _id: "64b0000000000000000000c1", role: "owner", passwordHash: await bcrypt.hash("dung", 4), isActive: true,
        failedLogins: 0, lockUntil: null, async save() {}, toJSON() { return { id: this._id, role: this.role }; },
    };
    test.mock.method(User, "findOne", () => ({ select: async () => user }));
    const r = await request(app).post("/api/auth/login").send({ username: "A", password: "dung" }).expect(200);
    assert.ok(r.body.data.accessToken && r.body.data.refreshToken);
    assert.equal(JSON.stringify(r.body).includes("passwordHash"), false);
});

test("public: token ngắn/sai => 422, token không tồn tại => 404 'QR không hợp lệ' (TC-02)", async () => {
    await request(app).get("/api/public/menu").expect(422);
    await request(app).get("/api/public/menu?token=abc").expect(422);
    test.mock.method(Table, "findOne", async () => null);
    const r = await request(app).get("/api/public/menu?token=" + "z".repeat(48)).expect(404);
    assert.match(r.body.message, /QR không hợp lệ/);
});

test("public: đơn không hợp lệ bị chặn trước khi chạm DB", async () => {
    const token = "t".repeat(48);
    await request(app).post("/api/public/orders").send({ token, items: [] }).expect(422);
    await request(app).post("/api/public/orders").send({ token, items: [{ productId: "x", quantity: 1 }] }).expect(422);
    await request(app).post("/api/public/orders")
        .send({ token, items: [{ productId: "64b0000000000000000000c1", quantity: 0 }] }).expect(422);
});

test("rate limit đặt đơn theo token bàn trả 429 (TC-11)", async () => {
    test.mock.method(Table, "findOne", async () => null); // dừng sớm ở bước nhận diện bàn
    const body = { token: "r".repeat(48), items: [{ productId: "64b0000000000000000000c1", quantity: 1 }] };
    const codes = [];
    for (let i = 0; i < 12; i++) codes.push((await request(app).post("/api/public/orders").send(body)).status);
    assert.equal(codes.filter((c) => c === 404).length, 8);
    assert.equal(codes.filter((c) => c === 429).length, 4);
    // Bàn khác không bị ảnh hưởng
    const other = await request(app).post("/api/public/orders").send({ ...body, token: "s".repeat(48) });
    assert.equal(other.status, 404);
});

test("JSON hỏng => 400, không lộ stack", async () => {
    const r = await request(app).post("/api/auth/login").set("Content-Type", "application/json").send("{bad").expect(400);
    assert.equal(r.body.stack, undefined);
});
