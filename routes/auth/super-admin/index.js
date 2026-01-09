const express = require("express");
const {
    getAllSuperAdmins,
    createSuperAdmin,
    updateSuperAdmin,
    deleteSuperAdmin,
    getSingleSuperAdmin,
} = require("../../../controllers/auth/super-admin/index");
const { superAdmin } = require("../../../middleware/auth/adminMiddleware");

const router = express.Router();

// Apply superAdmin middleware to all routes
router.use(superAdmin);

router.get("/:id", getSingleSuperAdmin);
router.patch("/:id", updateSuperAdmin);
router.delete("/:id", deleteSuperAdmin);
router.get("/", getAllSuperAdmins);
router.post("/", createSuperAdmin);

module.exports = router;
