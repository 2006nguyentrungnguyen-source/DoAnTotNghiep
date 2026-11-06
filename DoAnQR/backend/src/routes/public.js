// API công khai cho khách: xác thực bằng TOKEN BÀN (không cần đăng nhập).
const router = require("express").Router();
const { z } = require("zod");
const Table = require("../models/Table");
const Category = require("../models/Category");
const Product = require("../models/Product");
const Order = require("../models/Order");
const AppError = require("../utils/AppError");
const validate = require("../middleware/validate");
const { orderLimiter } = require("../middleware/rateLimit");
const { buildOrderItems, calcTotal } = require("../utils/pricing");
const { newOrderCode } = require("../utils/tokens");

const OPEN = Order.OPEN_STATUSES;
const tokenField = z.string().trim().min(16).max(128);
const oid = z.string().regex(/^[a-f\d]{24}$/i, "ID không hợp lệ");

const lineSchema = z.object({
    productId: oid,
    quantity: z.number().int().min(1).max(50),
    sizeId: oid.optional(),
    toppingIds: z.array(oid).max(10).optional(),
    note: z.string().trim().max(200).optional(),
});
const createSchema = z.object({
    token: tokenField,
    items: z.array(lineSchema).min(1).max(30),
    note: z.string().trim().max(300).optional(),
});
const addItemsSchema = z.object({ token: tokenField, items: z.array(lineSchema).min(1).max(30) });
const tokenQuery = z.object({ token: tokenField });

// Token sai / bàn bị vô hiệu: cùng một thông báo để không lộ thông tin.
async function tableFromToken(token) {
    const t = await Table.findOne({ token, isActive: true });
    if (!t) throw new AppError(404, "QR không hợp lệ, vui lòng gọi nhân viên");
    return t;
}

async function loadProducts(lines) {
    const ids = [...new Set(lines.map((l) => l.productId))];
    const products = await Product.find({ _id: { $in: ids } });
    return new Map(products.map((p) => [String(p._id), p]));
}

// GET /api/public/menu?token=
router.get("/menu", validate(tokenQuery, "query"), async (req, res) => {
    const table = await tableFromToken(req.valid.query.token);
    const [cats, products] = await Promise.all([
        Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }),
        Product.find({ isActive: true }).sort({ name: 1 }),
    ]);
    const byCat = new Map();
    for (const p of products) {
        const k = String(p.category);
        if (!byCat.has(k)) byCat.set(k, []);
        byCat.get(k).push(p);
    }
    res.json({
        success: true,
        data: {
            table: { id: String(table._id), name: table.name },
            categories: cats.map((c) => ({ ...c.toJSON(), products: byCat.get(String(c._id)) || [] })),
        },
    });
});

// Thêm một đợt món vào đơn đang mở của bàn (hoặc tạo đơn mới nếu chưa có).
async function placeBatch(table, lines, note) {
    const map = await loadProducts(lines);
    let order = await Order.findOne({ table: table._id, status: { $in: OPEN } }).sort({ createdAt: -1 });

    if (!order) {
        const items = buildOrderItems(map, lines, 1);
        return Order.create({
            code: newOrderCode(), table: table._id, status: "PENDING", note: note || "",
            items, totalAmount: calcTotal(items),
        });
    }
    const batchNo = Math.max(0, ...order.items.map((i) => i.batchNo)) + 1;
    order.items.push(...buildOrderItems(map, lines, batchNo));
    order.totalAmount = calcTotal(order.items);
    // Có đợt mới chưa được quầy xác nhận => đưa đơn về PENDING để quầy chú ý.
    if (order.status === "DONE") order.status = "PREPARING";
    await order.save();
    return order;
}

// POST /api/public/orders — gửi đơn; nếu bàn đang có đơn mở thì thành "đợt gọi thêm" (UC-04)
router.post("/orders", orderLimiter, validate(createSchema), async (req, res) => {
    const { token, items, note } = req.valid.body;
    const table = await tableFromToken(token);
    let order;
    try { order = await placeBatch(table, items, note); }
    catch (e) {
        if (e.code !== 11000) throw e;
        order = await placeBatch(table, items, note); // đua tạo đơn: lần 2 sẽ gắn vào đơn vừa được tạo
    }
    res.status(201).json({ success: true, data: order });
});

// POST /api/public/orders/:id/items — gọi thêm món vào một đơn cụ thể của bàn
router.post("/orders/:id/items", orderLimiter, validate(addItemsSchema), async (req, res) => {
    const table = await tableFromToken(req.valid.body.token);
    const order = await Order.findOne({ _id: req.params.id, table: table._id, status: { $in: OPEN } });
    if (!order) throw new AppError(404, "Không tìm thấy đơn đang mở của bàn này");

    const map = await loadProducts(req.valid.body.items);
    const batchNo = Math.max(0, ...order.items.map((i) => i.batchNo)) + 1;
    order.items.push(...buildOrderItems(map, req.valid.body.items, batchNo));
    order.totalAmount = calcTotal(order.items);
    if (order.status === "DONE") order.status = "PREPARING";
    await order.save();
    res.status(201).json({ success: true, data: order });
});

// GET /api/public/orders?token= — các đơn của bàn (đang mở trước, mới nhất trước)
router.get("/orders", validate(tokenQuery, "query"), async (req, res) => {
    const table = await tableFromToken(req.valid.query.token);
    // Chỉ trả đơn trong 12 giờ gần nhất để khách mới ngồi bàn không thấy đơn của người trước.
    const since = new Date(Date.now() - 12 * 3600_000);
    const orders = await Order.find({ table: table._id, createdAt: { $gte: since } }).sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
});

module.exports = router;
