const express = require("express");
const {
  getAllAdmins,
  registerAdmin,
  updateAdmin,
  deleteAdmin,
  loginAdmin,
  getAllSubAdmins,
  registerSubAdmin,
} = require("../../../controllers/auth/admin/index");
const {
  admin,
  superAdmin,
} = require("../../../middleware/auth/adminMiddleware");

const router = express.Router();

router.get("/", superAdmin, getAllAdmins);
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);
router.get("/sub-admin", admin, getAllSubAdmins);
router.post("/sub-admin", admin, registerSubAdmin);

// DEVELOPMENT API's
router.patch("/:id", updateAdmin);
router.delete("/:id", deleteAdmin);

module.exports = router;
