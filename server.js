require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db.js");

// Routes Import
const authUserRoutes = require("./routes/auth/user/index.js");
const authAdminRoutes = require("./routes/auth/admin/index.js");

// Connect DB
connectDB();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());
app.use(morgan("dev"));

// Routes
app.use("/api/auth/admin", authAdminRoutes);
app.use("/api/auth/user", authUserRoutes);

// Default Route
app.use("/", (req, res) => {
  res.json({ message: "Invalid route" });
});

app.use((req, res) => res.status(404).json({ message: "Route not found" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
