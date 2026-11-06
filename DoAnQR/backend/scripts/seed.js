// Chạy: npm run seed   (xóa và nạp lại dữ liệu mẫu: 3 tài khoản, 5 danh mục, 20 món, 10 bàn)
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../src/models/User");
const Category = require("../src/models/Category");
const Product = require("../src/models/Product");
const Table = require("../src/models/Table");
const Order = require("../src/models/Order");
const { newTableToken } = require("../src/utils/tokens");

const SIZES = [
    { type: "size", name: "S", extraPrice: 0 },
    { type: "size", name: "M", extraPrice: 5000 },
    { type: "size", name: "L", extraPrice: 10000 },
];
const TOPPINGS = [
    { type: "topping", name: "Trân châu đen", extraPrice: 7000 },
    { type: "topping", name: "Thạch dừa", extraPrice: 5000 },
    { type: "topping", name: "Kem cheese", extraPrice: 10000 },
];

const MENU = {
    "Cà phê": [["Cà phê đen", 25000], ["Cà phê sữa", 29000], ["Bạc xỉu", 32000], ["Cappuccino", 45000]],
    "Trà": [["Trà đào cam sả", 42000], ["Trà vải", 40000], ["Trà chanh", 30000], ["Trà sen vàng", 45000]],
    "Sinh tố & Đá xay": [["Sinh tố bơ", 48000], ["Sinh tố xoài", 45000], ["Matcha đá xay", 55000], ["Cookie đá xay", 55000]],
    "Nước ép": [["Cam ép", 40000], ["Dưa hấu ép", 38000], ["Cà rốt ép", 35000], ["Ổi ép", 38000]],
    "Bánh ngọt": [["Tiramisu", 45000], ["Bánh flan", 20000], ["Croissant", 35000], ["Bánh mousse chanh", 42000]],
};
const WITH_OPTIONS = new Set(["Cà phê", "Trà", "Sinh tố & Đá xay"]);

(async () => {
    if (!process.env.MONGODB_URI) throw new Error("Thiếu MONGODB_URI");
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_SEED !== "1")
        throw new Error("Từ chối seed ở production (đặt ALLOW_SEED=1 nếu thật sự muốn)");

    await mongoose.connect(process.env.MONGODB_URI);
    await Promise.all([User, Category, Product, Table, Order].map((m) => m.deleteMany({})));
    await Promise.all([User, Category, Product, Table, Order].map((m) => m.syncIndexes()));

    const ownerPw = process.env.SEED_OWNER_PASSWORD || "Owner@123";
    const staffPw = process.env.SEED_STAFF_PASSWORD || "Staff@123";
    await User.create([
        { username: "owner", passwordHash: await bcrypt.hash(ownerPw, 10), fullName: "Chủ quán", role: "owner" },
        { username: "staff1", passwordHash: await bcrypt.hash(staffPw, 10), fullName: "Nhân viên 1", role: "staff" },
        { username: "staff2", passwordHash: await bcrypt.hash(staffPw, 10), fullName: "Nhân viên 2", role: "staff" },
    ]);

    let order = 0;
    for (const [catName, items] of Object.entries(MENU)) {
        const cat = await Category.create({ name: catName, sortOrder: order++ });
        await Product.create(items.map(([name, basePrice]) => ({
            category: cat._id, name, basePrice,
            description: `${name} - pha chế tại quán`,
            options: WITH_OPTIONS.has(catName) ? [...SIZES, ...TOPPINGS] : [],
        })));
    }

    const tables = await Table.create(
        Array.from({ length: 10 }, (_, i) => ({ name: `Bàn ${String(i + 1).padStart(2, "0")}`, token: newTableToken() })),
    );

    console.log("Seed xong: 3 tài khoản, 5 danh mục, 20 món, 10 bàn");
    console.log(`  owner  / ${ownerPw}\n  staff1 / ${staffPw}\n  staff2 / ${staffPw}`);
    console.log("  Đổi mật khẩu ngay nếu dùng ngoài môi trường dev. Số bàn:", tables.length);
    await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
