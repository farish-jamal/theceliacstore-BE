const express = require("express");
const ReviewController = require("../../controllers/reviews/index.js");
const { user } = require("../../middleware/auth/userMiddleware.js");
const router = express.Router();

router.get("/", ReviewController.getAllReviews);
router.post("/", user, ReviewController.postReviews);

module.exports = router;
