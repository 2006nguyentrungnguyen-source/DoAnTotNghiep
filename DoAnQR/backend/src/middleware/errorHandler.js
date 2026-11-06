const AppError = require("../utils/AppError");

const notFound = (req, _res, next) => next(new AppError(404, `Không tìm thấy ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
    let status = err.status || 500;
    let message = err.message;
    let errors = err.errors;

    if (err.name === "CastError") { status = 400; message = "ID không hợp lệ"; }
    else if (err.name === "ValidationError" && err.errors) {
        status = 422; message = "Dữ liệu không hợp lệ";
        errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    } else if (err.code === 11000) {
        status = 409; message = `Giá trị đã tồn tại: ${Object.keys(err.keyPattern || {}).join(", ")}`;
    } else if (err.type === "entity.parse.failed") { status = 400; message = "JSON không hợp lệ"; }
    else if (err.name === "MulterError") { status = 400; message = err.code === "LIMIT_FILE_SIZE" ? "Ảnh vượt quá 2MB" : err.message; }

    if (status >= 500) {
        console.error(err);
        message = "Lỗi máy chủ";   // không lộ chi tiết nội bộ
        errors = undefined;
    }
    res.status(status).json({ success: false, message, ...(errors ? { errors } : {}) });
}

module.exports = { notFound, errorHandler };
