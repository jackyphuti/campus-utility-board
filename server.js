require("dotenv").config();

const connectDB = require("./config/db");

const bootstrap = async () => {
	await connectDB();
	require("./src/server");
};

bootstrap();
