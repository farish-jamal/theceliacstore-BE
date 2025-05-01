const express = require("express");
const BrandController = require("../../controllers/brand/index.js");
const multer = require("multer");
const { storage } = require("../../config/multer.js");
const { admin, adminOrSubAdmin } = require("../../middleware/auth/adminMiddleware.js");
const router = express.Router();

const upload = multer({ storage: storage });

// User Routes
router.post(
  "/",
  admin,
  upload.array("images"),
  BrandController.createBrand
);
router.get("/", BrandController.getAllBrands);

// Admin Routes
router.get("/admin", adminOrSubAdmin, BrandController.getBrandsByAdmin);
router.put(
  "/:id",
  admin,
  upload.array("images"),
  BrandController.updateBrand
);
router.get("/:id", admin, BrandController.getBrandById);
router.delete("/:id", admin, BrandController.deleteBrand);

module.exports = router;