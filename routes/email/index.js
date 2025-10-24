const express = require("express");
const router = express.Router();
const {
  sendCustomEmailManual,
  resendOrderConfirmation,
  resendStatusUpdate,
  resendWelcomeEmail,
  getFailedEmails,
  sendTestEmail,
} = require("../../controllers/email");
const { adminOrSubAdminOrSuperAdmin } = require("../../middleware/auth/adminMiddleware");


// Send custom email manually
router.post("/send-custom", sendCustomEmailManual);

// Send test email
router.post("/send-test", sendTestEmail);

// Resend order confirmation email
router.post("/resend-order-confirmation/:orderId", resendOrderConfirmation);

// Resend status update email
router.post("/resend-status-update/:orderId/:status", resendStatusUpdate);

// Resend welcome email
router.post("/resend-welcome/:userId", resendWelcomeEmail);

// Get failed emails for manual resending
router.get("/failed-emails", getFailedEmails);

module.exports = router;
