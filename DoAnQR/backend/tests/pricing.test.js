require("./setup");
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildOrderItems, calcTotal } = require("../src/utils/pricing");

const P1 = "64b000000000000000000001";
const S_M = "64b0000000000000000000a1", S_L = "64b0000000000000000000a2";
const T_TC = "64b0000000000000000000b1", T_KC = "64b0000000000000000000b2";

const product = (over = {}) => ({
    _id: P1, name: "Cà phê sữa", basePrice: 29000, isActive: true, isAvailable: true,
    options: [
        { _id: S_M, type: "size", name: "M", extraPrice: 5000 },
        { _id: S_L, type: "size", name: "L", extraPrice: 10000 },
        { _id: T_TC, type: "topping", name: "Trân châu", extraPrice: 7000 },
        { _id: T_KC, type: "topping", name: "Kem cheese", extraPrice: 10000 },
    ], ...over,
});
const map = (p) => new Map([[String(p._id), p]]);

test("TC-06: size L + 2 topping, SL 2 => (giá + phụ thu) x 2", () => {
    const [it] = buildOrderItems(map(product()), [{ productId: P1, quantity: 2, sizeId: S_L, toppingIds: [T_TC, T_KC] }]);
    assert.equal(it.unitPrice, 29000 + 10000 + 7000 + 10000);
    assert.equal(calcTotal([it]), 56000 * 2);
    assert.equal(it.productName, "Cà phê sữa"); // snapshot tên
});

test("giá do client gửi lên bị bỏ qua", () => {
    const [it] = buildOrderItems(map(product()), [{ productId: P1, quantity: 1, sizeId: S_M, unitPrice: 1, price: 1 }]);
    assert.equal(it.unitPrice, 34000);
});

test("topping bị lặp chỉ tính một lần", () => {
    const [it] = buildOrderItems(map(product()), [{ productId: P1, quantity: 1, sizeId: S_M, toppingIds: [T_TC, T_TC] }]);
    assert.equal(it.unitPrice, 29000 + 5000 + 7000);
});

test("món hết hàng => lỗi 409 (TC-09)", () => {
    assert.throws(
        () => buildOrderItems(map(product({ isAvailable: false })), [{ productId: P1, quantity: 1, sizeId: S_M }]),
        (e) => e.status === 409 && /hết/.test(e.message));
});

test("món bị ẩn / không tồn tại => 400", () => {
    assert.throws(() => buildOrderItems(map(product({ isActive: false })), [{ productId: P1, quantity: 1 }]), (e) => e.status === 400);
    assert.throws(() => buildOrderItems(new Map(), [{ productId: P1, quantity: 1 }]), (e) => e.status === 400);
});

test("option của món khác / sai loại / thiếu size => 400", () => {
    const m = map(product());
    assert.throws(() => buildOrderItems(m, [{ productId: P1, quantity: 1, sizeId: T_TC }]), (e) => e.status === 400); // topping dùng làm size
    assert.throws(() => buildOrderItems(m, [{ productId: P1, quantity: 1, sizeId: S_M, toppingIds: [S_L] }]), (e) => e.status === 400);
    assert.throws(() => buildOrderItems(m, [{ productId: P1, quantity: 1 }]), (e) => e.status === 400 && /size/.test(e.message));
});

test("món không có size thì không bắt chọn size", () => {
    const [it] = buildOrderItems(map(product({ options: [] })), [{ productId: P1, quantity: 3 }]);
    assert.equal(calcTotal([it]), 87000);
});

test("calcTotal bỏ qua món đã hủy; batchNo được gán", () => {
    const items = buildOrderItems(map(product({ options: [] })), [{ productId: P1, quantity: 1 }, { productId: P1, quantity: 2 }], 3);
    assert.ok(items.every((i) => i.batchNo === 3));
    items[1].status = "CANCELLED";
    assert.equal(calcTotal(items), 29000);
});
