const mongoose = require("mongoose");

// size / topping nhúng trực tiếp trong món (thay cho bảng product_options).
const optionSchema = new mongoose.Schema({
    type: { type: String, enum: ["size", "topping"], required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    extraPrice: { type: Number, default: 0, min: 0 },
});

const productSchema = new mongoose.Schema({
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: "" },
    basePrice: { type: Number, required: true, min: 0 }, // VND, số nguyên
    imageUrl: { type: String, default: "" },
    isAvailable: { type: Boolean, default: true }, // còn / hết món
    isActive: { type: Boolean, default: true },    // ẩn / hiện
    options: [optionSchema],
}, { timestamps: true });

productSchema.path("basePrice").validate(Number.isInteger, "Giá phải là số nguyên (VND)");
optionSchema.path("extraPrice").validate(Number.isInteger, "Phụ thu phải là số nguyên (VND)");

const clean = (_d, r) => { r.id = String(r._id); delete r._id; delete r.__v; return r; };
optionSchema.set("toJSON", { transform: clean });
productSchema.set("toJSON", { transform: clean });

module.exports = mongoose.model("Product", productSchema);
