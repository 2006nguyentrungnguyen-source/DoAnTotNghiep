const mongoose = require("mongoose");

const tableSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true, maxlength: 20 },
    token: { type: String, required: true, unique: true, select: false }, // không lộ token ra API thường
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

tableSchema.set("toJSON", {
    transform: (_d, r) => { r.id = String(r._id); delete r._id; delete r.__v; delete r.token; return r; },
});

module.exports = mongoose.model("Table", tableSchema);
