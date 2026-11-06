const AppError = require("./AppError");

/**
 * Dựng các dòng đơn hàng từ dữ liệu khách gửi + sản phẩm lấy từ DB.
 * Quy tắc cốt lõi: KHÔNG BAO GIỜ tin giá từ client (FR-06, FR-35, NFR-15).
 * Hàm thuần (không đụng DB) để test dễ.
 *
 * @param {Map<string,object>} productMap  id -> product (có options)
 * @param {Array} input  [{ productId, quantity, sizeId?, toppingIds?, note? }]
 * @param {number} batchNo
 */
function buildOrderItems(productMap, input, batchNo = 1) {
    const unavailable = [];
    const items = input.map((line) => {
        const p = productMap.get(String(line.productId));
        if (!p || !p.isActive) throw new AppError(400, "Có món không tồn tại hoặc đã ngừng bán");
        if (!p.isAvailable) { unavailable.push(p.name); return null; }

        const opts = p.options || [];
        const chosen = [];

        if (line.sizeId) {
            const s = opts.find((o) => String(o._id) === String(line.sizeId) && o.type === "size");
            if (!s) throw new AppError(400, `Size không hợp lệ cho món "${p.name}"`);
            chosen.push(s);
        } else if (opts.some((o) => o.type === "size")) {
            throw new AppError(400, `Món "${p.name}" cần chọn size`);
        }

        const toppingIds = [...new Set((line.toppingIds || []).map(String))];
        for (const tid of toppingIds) {
            const t = opts.find((o) => String(o._id) === tid && o.type === "topping");
            if (!t) throw new AppError(400, `Topping không hợp lệ cho món "${p.name}"`);
            chosen.push(t);
        }

        const unitPrice = p.basePrice + chosen.reduce((s, o) => s + o.extraPrice, 0);
        return {
            product: p._id,
            productName: p.name, // snapshot tên
            unitPrice,           // snapshot giá
            quantity: line.quantity,
            options: chosen.map((o) => ({ type: o.type, name: o.name, extraPrice: o.extraPrice })),
            batchNo,
            status: "PENDING",
            note: line.note || "",
        };
    });

    if (unavailable.length) {
        throw new AppError(409, `Món đã hết: ${unavailable.join(", ")}. Vui lòng bỏ món khỏi giỏ.`);
    }
    return items;
}

// Tổng tiền: bỏ các món đã hủy.
const calcTotal = (items) =>
    items.filter((i) => i.status !== "CANCELLED").reduce((s, i) => s + i.unitPrice * i.quantity, 0);

module.exports = { buildOrderItems, calcTotal };
