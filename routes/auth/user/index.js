const express = require("express");
const {
  getAllUsers,
  registerUser,
  updateUser,
  deleteUser,
  loginUser,
  getUserById,
  // logoutUser,
} = require("../../../controllers/auth/user/index");
const { superAdmin } = require("../../../middleware/auth/adminMiddleware");
const router = express.Router();

router.get("/", superAdmin, getAllUsers);
router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/:id", getUserById);

// router.post("/logout", logoutUser);

// DEVELOPMENT API's
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = router;
