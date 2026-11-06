const mongoose = require("mongoose");

// Gộp bảng roles + users của sheet CSDL: vai trò là enum owner | staff.
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 50 },
    passwordHash: { type: String, required: true, select: false },
    fullName: { type: String, trim: true, maxlength: 100, default: "" },
    role: { type: String, enum: ["owner", "staff"], default: "staff", required: true },
    isActive: { type: Boolean, default: true },
    failedLogins: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
}, { timestamps: true });

userSchema.set("toJSON", {
    transform: (_d, r) => {
        r.id = String(r._id);
        delete r._id; delete r.__v; delete r.passwordHash; delete r.failedLogins; delete r.lockUntil;
        return r;
    },
});

module.exports = mongoose.model("User", userSchema);
