const router = require("express").Router();
const QRCode = require("qrcode");
const { z } = require("zod");
const Table = require("../models/Table");
const Order = require("../models/Order");
const AppError = require("../utils/AppError");
const validate = require("../middleware/validate");
const { authenticate, authorize } = require("../middleware/auth");
const { newTableToken } = require("../utils/tokens");
const { env } = require("../config/env");

const schema = z.object({
    name: z.string().trim().min(1).max(20),
    isActive: z.boolean().optional(),
});
const patch = schema.partial().refine((d) => Object.keys(d).length > 0, "Không có dữ liệu để cập nhật");
const qrQuery = z.object({
    format: z.enum(["png", "svg"]).default("png"),
    size: z.coerce.number().int().min(128).max(1024).default(512),
});

const qrUrl = (token) => `${env.clientUrl}/order?token=${token}`;

router.use(authenticate, authorize("owner"));

router.get("/", async (_req, res) => {
    res.json({ success: true, data: await Table.find().sort({ name: 1 }) });
});

router.post("/", validate(schema), async (req, res) => {
    const t = await Table.create({ ...req.valid.body, token: newTableToken() });
    res.status(201).json({ success: true, data: t });
});

router.put("/:id", validate(patch), async (req, res) => {
    const t = await Table.findByIdAndUpdate(req.params.id, req.valid.body, { new: true, runValidators: true });
    if (!t) throw new AppError(404, "Không tìm thấy bàn");
    res.json({ success: true, data: t });
});

// Bàn đã từng có đơn thì chỉ vô hiệu hóa (giữ lịch sử), chưa có thì xóa hẳn.
router.delete("/:id", async (req, res) => {
    const used = await Order.exists({ table: req.params.id });
    if (used) {
        const t = await Table.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!t) throw new AppError(404, "Không tìm thấy bàn");
        return res.json({ success: true, message: "Bàn đã có lịch sử đơn nên chỉ bị vô hiệu hóa", data: t });
    }
    const t = await Table.findByIdAndDelete(req.params.id);
    if (!t) throw new AppError(404, "Không tìm thấy bàn");
    res.json({ success: true, message: "Đã xóa bàn" });
});

// Đổi token: QR cũ vô hiệu ngay (FR-25).
router.post("/:id/regenerate-token", async (req, res) => {
    const t = await Table.findByIdAndUpdate(req.params.id, { token: newTableToken() }, { new: true });
    if (!t) throw new AppError(404, "Không tìm thấy bàn");
    res.json({ success: true, message: "Đã đổi token, QR cũ không còn hiệu lực", data: t });
});

// GET /api/tables/:id/qr?format=png|svg&size=512
router.get("/:id/qr", validate(qrQuery, "query"), async (req, res) => {
    const t = await Table.findById(req.params.id).select("+token");
    if (!t) throw new AppError(404, "Không tìm thấy bàn");
    const { format, size } = req.valid.query;
    const url = qrUrl(t.token);
    res.set("Cache-Control", "no-store");
    if (format === "svg") {
        res.type("image/svg+xml").send(await QRCode.toString(url, { type: "svg", margin: 2, width: size }));
    } else {
        res.type("image/png").send(await QRCode.toBuffer(url, { margin: 2, width: size, errorCorrectionLevel: "M" }));
    }
});

module.exports = router;
