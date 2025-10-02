require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db.js");
const swaggerSpec = require("./swagger.js");
const swaggerUI = require("swagger-ui-express");

// Routes Import
const authUserRoutes = require("./routes/auth/user/index.js");
const authAdminRoutes = require("./routes/auth/admin/index.js");
const categoryRoutes = require("./routes/category/index.js");
const subCategoryRoutes = require("./routes/sub-category/index.js");
const brandRoutes = require("./routes/brand/index.js");
const productRoutes = require("./routes/product/index.js");
const cartRoutes = require("./routes/cart/index.js");
const reviewsRoutes = require("./routes/reviews/index.js");
const addressRoutes = require("./routes/address/index.js");
const blogsRoutes = require("./routes/blogs/index.js");
const contactUsRoutes = require("./routes/contact_us/index.js");
const orderRoutes = require("./routes/order/index.js");
const bundleRoutes = require("./routes/bundle/index.js");
const dashboardRoutes = require("./routes/dashboard/index.js");

// Connect DB
connectDB();

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: "*",
  credentials: true
}));app.use(morgan("dev"));

// Routes
app.use("/api/auth/admin", authAdminRoutes);
app.use("/api/auth/user", authUserRoutes);
app.use("/api/category", categoryRoutes);
app.use("/api/sub-category", subCategoryRoutes);
app.use("/api/brand", brandRoutes);
app.use("/api/product", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/reviews", reviewsRoutes);
app.use("/api/address", addressRoutes);
app.use("/api/blogs", blogsRoutes);
app.use("/api/contact-us", contactUsRoutes);
app.use("/api/order", orderRoutes);
app.use("/api/bundles", bundleRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use("/api-doc", swaggerUI.serve, swaggerUI.setup(swaggerSpec));

// Default Route
app.use("/", (req, res) => {
  res.json({ message: "API WORKING" });
});

app.use((req, res) => res.status(404).json({ message: "Route not found" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
