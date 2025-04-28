const express = require("express");
const CategoryController = require("../../controllers/category/index.js");
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
  CategoryController.createCategory
);
router.get("/", CategoryController.getAllCategory);

// Admin Routes
router.get("/admin", adminOrSubAdmin, CategoryController.getCategoriesByAdmin);
router.put(
  "/:id",
  admin,
  upload.array("images"),
  CategoryController.updateCategory
);
router.get("/:id", admin, CategoryController.getCategoryById);
router.delete("/:id", admin, CategoryController.deleteCategory);

module.exports = router;
