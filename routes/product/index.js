const express = require("express");
const ProductsController = require("../../controllers/products/index.js");
const multer = require("multer");
const { storage } = require("../../config/multer.js");
const {
  adminOrSuperAdmin,
} = require("../../middleware/auth/adminMiddleware.js");
const router = express.Router();

const upload = multer({ storage: storage });

router.post(
  "/",
  adminOrSuperAdmin,
  upload.any(),
  ProductsController.createProduct
);

router.get("/export", adminOrSuperAdmin, ProductsController.exportProducts);
router.get("/admin", adminOrSuperAdmin, ProductsController.getProductsByAdmin);
router.post("/batch", adminOrSuperAdmin, ProductsController.bulkCreateProducts);
router.get("/", ProductsController.getAllProducts);
router.get("/:id", ProductsController.getProductById);
router.put(
  "/:id",
  adminOrSuperAdmin,
  upload.any(),
  ProductsController.updateProduct
);
router.delete("/:id", adminOrSuperAdmin, ProductsController.deleteProduct);

module.exports = router;
