const mongoose = require("mongoose");

const ORDER_STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "DONE", "PAID", "CANCELLED"];
const OPEN_STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "DONE"]; // đơn "đang mở" của bàn

// order_items nhúng trong đơn. Tên và giá là SNAPSHOT tại thời điểm đặt (FR-35 / NFR-15).
const itemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 }, // đã gồm size + topping
    quantity: { type: Number, required: true, min: 1 },
    options: [{ _id: false, type: { type: String }, name: String, extraPrice: Number }],
    batchNo: { type: Number, default: 1 },               // đợt gọi
    status: { type: String, enum: ORDER_STATUSES, default: "PENDING" },
    cancelReason: { type: String, default: "" },
    note: { type: String, default: "" },
});

const orderSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    table: { type: mongoose.Schema.Types.ObjectId, ref: "Table", required: true },
    status: { type: String, enum: ORDER_STATUSES, default: "PENDING" },
    totalAmount: { type: Number, required: true, min: 0 }, // luôn do server tính
    note: { type: String, default: "" },
    items: [itemSchema],
    paidAt: { type: Date, default: null },
}, { timestamps: true });

orderSchema.index({ createdAt: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ table: 1, status: 1 });
// Mỗi bàn chỉ có tối đa 1 đơn "đang mở" -> chặn tạo trùng khi 2 khách gửi cùng lúc.
orderSchema.index({ table: 1 }, { unique: true, partialFilterExpression: { status: { $in: OPEN_STATUSES } }, name: "one_open_order_per_table" });

const clean = (_d, r) => { r.id = String(r._id); delete r._id; delete r.__v; return r; };
itemSchema.set("toJSON", { transform: clean });
orderSchema.set("toJSON", { transform: clean });

module.exports = mongoose.model("Order", orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.OPEN_STATUSES = OPEN_STATUSES;
