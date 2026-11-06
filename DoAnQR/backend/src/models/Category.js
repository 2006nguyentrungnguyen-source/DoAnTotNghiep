const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 80 },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

categorySchema.set("toJSON", {
    transform: (_d, r) => { r.id = String(r._id); delete r._id; delete r.__v; return r; },
});

module.exports = mongoose.model("Category", categorySchema);
