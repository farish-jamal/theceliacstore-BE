const express = require("express");
const router = express.Router();
const OrderController = require("../../controllers/order/index.js");
const { user } = require("../../middleware/auth/userMiddleware.js");
const {
  adminOrSuperAdmin,
} = require("../../middleware/auth/adminMiddleware.js");

// router.get("/export", superAdmin, OrderController.exportOrders);
router.get("/", adminOrSuperAdmin, OrderController.getAllOrders);
// router.get("/overview", adminOrSuperAdmin, OrderController.getOrderOverview);

router.post("/", user, OrderController.createOrder);
// router.post("/buy-now", user, OrderController.buyNowOrder);
router.get("/history", user, OrderController.getOrderHistory);
router.get("/products-with-orders", adminOrSuperAdmin, OrderController.getProductsWithOrderCounts);
router.get("/by-product/:productId", adminOrSuperAdmin, OrderController.getOrdersByProductId);
router.patch("/:id", adminOrSuperAdmin, OrderController.updateOrder);
router.patch("/:id/status", adminOrSuperAdmin, OrderController.updateOrderStatus);
router.patch("/edit/:id", user, OrderController.editOrder);
router.get("/:id", adminOrSuperAdmin, OrderController.getOrderById);
// router.get("/generate-order-bill/:id", user, OrderController.generateOrderBill);

module.exports = router;
