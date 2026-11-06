require("dotenv").config();

const { env, assertEnv } = require("./src/config/env");
assertEnv();

const app = require("./src/app");
const connectDB = require("./src/config/database");

const startServer = async () => {
    await connectDB();
    app.listen(env.port, () => console.log(`Server running at http://localhost:${env.port}`));
};

startServer();
