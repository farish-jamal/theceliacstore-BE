const express = require("express");
const router = express.Router();
const BlogController = require("../../controllers/blogs/index.js");
const multer = require("multer");
const { storage } = require("../../config/multer.js");
const {
  admin,
  superAdmin,
  adminOrSuperAdmin,
} = require("../../middleware/auth/adminMiddleware.js");

const upload = multer({ storage: storage });

router.post(
  "/",
  adminOrSuperAdmin,
  upload.single("bannerImageUrl"),
  BlogController.postBlogs
);
router.get("/", BlogController.getBlogs);
router.get("/:id", BlogController.getSingleBlog);
router.put(
  "/:id",
  adminOrSuperAdmin,
  upload.single("bannerImageUrl"),
  BlogController.updateBlog
);
router.delete("/:id", adminOrSuperAdmin, BlogController.deleteBlog);

module.exports = router;
