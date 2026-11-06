const fs = require("fs");
const path = require("path");
const router = require("express").Router();
const { z } = require("zod");
const Product = require("../models/Product");
const Category = require("../models/Category");
const AppError = require("../utils/AppError");
const validate = require("../middleware/validate");
const { authenticate, authorize } = require("../middleware/auth");
const { upload, UPLOAD_DIR, hasImageSignature } = require("../middleware/upload");

const optionSchema = z.object({
    type: z.enum(["size", "topping"]),
    name: z.string().trim().min(1).max(60),
    extraPrice: z.number().int().min(0).default(0),
});
const productSchema = z.object({
    category: z.string().regex(/^[a-f\d]{24}$/i, "ID danh mục không hợp lệ"),
    name: z.string().trim().min(1).max(120),
    description: z.string().max(2000).optional(),
    basePrice: z.number().int().min(0),
    isAvailable: z.boolean().optional(),
    isActive: z.boolean().optional(),
    options: z.array(optionSchema).max(30).optional(),
});
const patch = productSchema.partial().refine((d) => Object.keys(d).length > 0, "Không có dữ liệu để cập nhật");
const listQuery = z.object({
    category: z.string().optional(),
    q: z.string().trim().max(100).optional(),
});

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

router.use(authenticate);

router.get("/", validate(listQuery, "query"), async (req, res) => {
    const { category, q } = req.valid.query;
    const filter = {};
    if (category) filter.category = category;
    if (q) filter.name = new RegExp(escapeRegex(q), "i");
    res.json({ success: true, data: await Product.find(filter).sort({ name: 1 }) });
});

router.get("/:id", async (req, res) => {
    const p = await Product.findById(req.params.id);
    if (!p) throw new AppError(404, "Không tìm thấy món");
    res.json({ success: true, data: p });
});

async function assertCategory(id) {
    if (!(await Category.exists({ _id: id }))) throw new AppError(400, "Danh mục không tồn tại");
}

router.post("/", authorize("owner"), validate(productSchema), async (req, res) => {
    await assertCategory(req.valid.body.category);
    res.status(201).json({ success: true, data: await Product.create(req.valid.body) });
});

router.put("/:id", authorize("owner"), validate(patch), async (req, res) => {
    if (req.valid.body.category) await assertCategory(req.valid.body.category);
    const p = await Product.findByIdAndUpdate(req.params.id, req.valid.body, { new: true, runValidators: true });
    if (!p) throw new AppError(404, "Không tìm thấy món");
    res.json({ success: true, data: p });
});

// Xóa mềm: đơn cũ đã snapshot tên/giá nên không ảnh hưởng, nhưng món biến mất khỏi menu khách.
router.delete("/:id", authorize("owner"), async (req, res) => {
    const p = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!p) throw new AppError(404, "Không tìm thấy món");
    res.json({ success: true, message: "Đã ẩn món khỏi menu", data: p });
});

// PATCH /api/products/:id/availability  — nhân viên báo hết món / bật lại
router.patch("/:id/availability", validate(z.object({ isAvailable: z.boolean() })), async (req, res) => {
    const p = await Product.findByIdAndUpdate(req.params.id, { isAvailable: req.valid.body.isAvailable }, { new: true });
    if (!p) throw new AppError(404, "Không tìm thấy món");
    res.json({ success: true, data: p });
});

// Quản lý size/topping
router.post("/:id/options", authorize("owner"), validate(optionSchema), async (req, res) => {
    const p = await Product.findById(req.params.id);
    if (!p) throw new AppError(404, "Không tìm thấy món");
    p.options.push(req.valid.body);
    await p.save();
    res.status(201).json({ success: true, data: p });
});

router.put("/:id/options/:optionId", authorize("owner"), validate(optionSchema.partial()), async (req, res) => {
    const p = await Product.findById(req.params.id);
    const opt = p && p.options.id(req.params.optionId);
    if (!opt) throw new AppError(404, "Không tìm thấy tùy chọn");
    opt.set(req.valid.body);
    await p.save();
    res.json({ success: true, data: p });
});

router.delete("/:id/options/:optionId", authorize("owner"), async (req, res) => {
    const p = await Product.findById(req.params.id);
    const opt = p && p.options.id(req.params.optionId);
    if (!opt) throw new AppError(404, "Không tìm thấy tùy chọn");
    opt.deleteOne();
    await p.save();
    res.json({ success: true, data: p });
});

// POST /api/products/:id/image  (multipart, field "image")
router.post("/:id/image", authorize("owner"), upload.single("image"), async (req, res) => {
    if (!req.file) throw new AppError(400, "Thiếu file ảnh (field 'image')");
    if (!hasImageSignature(req.file.path)) {
        fs.unlinkSync(req.file.path);
        throw new AppError(400, "File không phải ảnh hợp lệ");
    }
    const p = await Product.findById(req.params.id);
    if (!p) { fs.unlinkSync(req.file.path); throw new AppError(404, "Không tìm thấy món"); }

    // Xóa ảnh cũ do mình upload (chỉ khi nằm trong thư mục uploads).
    if (p.imageUrl.startsWith("/uploads/")) {
        const old = path.join(UPLOAD_DIR, path.basename(p.imageUrl));
        fs.promises.unlink(old).catch(() => {});
    }
    p.imageUrl = `/uploads/${req.file.filename}`;
    await p.save();
    res.json({ success: true, data: p });
});

module.exports = router;
