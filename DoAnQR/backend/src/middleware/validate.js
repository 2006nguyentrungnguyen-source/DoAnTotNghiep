const AppError = require("../utils/AppError");

// validate(schema, "body" | "query" | "params")
const validate = (schema, source = "body") => (req, _res, next) => {
    const r = schema.safeParse(req[source]);
    if (!r.success) {
        const errors = r.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
        throw new AppError(422, "Dữ liệu không hợp lệ", errors);
    }
    // Express 5: req.query là getter, nên gán vào req.valid thay vì ghi đè.
    req.valid = { ...(req.valid || {}), [source]: r.data };
    next();
};

module.exports = validate;
