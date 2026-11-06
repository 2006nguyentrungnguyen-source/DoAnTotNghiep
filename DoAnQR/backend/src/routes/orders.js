// API cho nhân viên / chủ quán: xem đơn, đổi trạng thái.
const router = require("express").Router();
const { z } = require("zod");
const Order = require("../models/Order");
const AppError = require("../utils/AppError");
const validate = require("../middleware/validate");
const { authenticate } = require("../middleware/auth");

// Chỉ cho phép chuyển trạng thái theo đúng thứ tự (FR-15).
// Hủy và thanh toán sẽ làm ở tuần 7 (T59, T60), nên chưa mở ở đây.
const NEXT = { PENDING: ["CONFIRMED"], CONFIRMED: ["PREPARING"], PREPARING: ["DONE"] };

const statusSchema = z.object({ status: z.enum(["CONFIRMED", "PREPARING", "DONE"]) });
const listQuery = z.object({
    status: z.enum(Order.ORDER_STATUSES).optional(),
    table: z.string().regex(/^[a-f\d]{24}$/i).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.use(authenticate);

router.get("/", validate(listQuery, "query"), async (req, res) => {
    const { status, table, from, to, page, limit } = req.valid.query;
    const filter = {};
    if (status) filter.status = status;
    if (table) filter.table = table;
    if (from || to) filter.createdAt = { ...(from && { $gte: from }), ...(to && { $lte: to }) };

    const [data, total] = await Promise.all([
        Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("table", "name"),
        Order.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

router.get("/:id", async (req, res) => {
    const o = await Order.findById(req.params.id).populate("table", "name");
    if (!o) throw new AppError(404, "Không tìm thấy đơn");
    res.json({ success: true, data: o });
});

router.patch("/:id/status", validate(statusSchema), async (req, res) => {
    const next = req.valid.body.status;
    const o = await Order.findById(req.params.id);
    if (!o) throw new AppError(404, "Không tìm thấy đơn");
    if (!(NEXT[o.status] || []).includes(next)) {
        throw new AppError(409, `Không thể chuyển từ ${o.status} sang ${next}`);
    }
    o.status = next;
    for (const it of o.items) if (it.status !== "CANCELLED") it.status = next;
    await o.save();
    res.json({ success: true, data: o });
});

module.exports = router;
