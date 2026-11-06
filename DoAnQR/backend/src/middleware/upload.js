const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const AppError = require("../utils/AppError");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const EXT = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const upload = multer({
    storage: multer.diskStorage({
        destination: UPLOAD_DIR,
        // Tên file do server sinh, không dùng tên gốc của client (tránh path traversal).
        filename: (_req, file, cb) => cb(null, crypto.randomBytes(12).toString("hex") + EXT[file.mimetype]),
    }),
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) =>
        EXT[file.mimetype] ? cb(null, true) : cb(new AppError(400, "Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP")),
});

// Header Content-Type có thể bị giả mạo nên kiểm tra thêm chữ ký (magic bytes) của file.
function hasImageSignature(filePath) {
    const b = Buffer.alloc(12);
    const fd = fs.openSync(filePath, "r");
    try { fs.readSync(fd, b, 0, 12, 0); } finally { fs.closeSync(fd); }
    const jpg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    const png = b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const webp = b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP";
    return jpg || png || webp;
}

module.exports = { upload, UPLOAD_DIR, hasImageSignature };
