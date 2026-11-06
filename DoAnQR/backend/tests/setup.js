process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://localhost/test";
process.env.JWT_ACCESS_SECRET = "a".repeat(40);
process.env.JWT_REFRESH_SECRET = "b".repeat(40);
