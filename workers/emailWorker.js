const { Worker } = require("bullmq");
const redisConfig = require("../config/redis");
const { sendEmail } = require("../utils/email/emailService");
const {
  generateCustomerOrderConfirmation,
  generateCompanyOrderNotification,
} = require("../utils/email/templates/orderConfirmation");
const {
  generateCustomerStatusUpdate,
  generateCompanyStatusUpdate,
} = require("../utils/email/templates/orderStatusUpdate");
const { generateWelcomeEmail } = require("../utils/email/templates/welcomeEmail");
const { generateForgotPasswordEmail } = require("../utils/email/templates/forgotPassword");
const emailConfig = require("../config/email");
const Order = require("../models/orderModel");
const Admin = require("../models/adminModel");

// Create worker to process email jobs
const emailWorker = new Worker(
  "email-notifications",
  async (job) => {
    const { type, data } = job.data;

    try {
      switch (type) {
        case "order-confirmation":
          await sendOrderConfirmationEmails(data);
          break;

        case "status-update":
          await sendStatusUpdateEmails(data);
          break;

        case "welcome":
          await sendWelcomeEmail(data);
          break;

        case "forgot-password":
          await sendForgotPasswordEmail(data);
          break;

        default:
          throw new Error(`Unknown email type: ${type}`);
      }

      console.log(`Email job ${type} completed successfully`);
      return { success: true, type };
    } catch (error) {
      console.error(`Email job ${type} failed:`, error);
      throw error; // This will trigger retry
    }
  },
  {
    connection: redisConfig,
    concurrency: 5, // Process 5 emails at a time
  }
);

/**
 * Send order confirmation emails
 */
async function sendOrderConfirmationEmails(data) {
  const { order, user } = data;
  const emailPromises = [];

  console.log("\n🎯 Processing Order Confirmation Emails");
  console.log("📦 Order ID:", order._id);
  console.log("👤 Customer:", user.name, `(${user.email})`);

  // Update email tracking - attempt started
  await Order.findByIdAndUpdate(order._id, {
    $inc: { "emailTracking.confirmation.attempts": 1 },
    $set: { "emailTracking.confirmation.lastAttemptAt": new Date() },
  });

  try {
    // Send to customer
    if (user.email) {
      console.log("📨 Preparing customer email to:", user.email);
      const customerHTML = generateCustomerOrderConfirmation(order, user);
      // Add tracking pixel
      const htmlWithTracking = addTrackingPixel(customerHTML, order._id, "confirmation");
      emailPromises.push(
        sendEmail({
          to: user.email,
          subject: `Order Confirmation - Order #${order._id}`,
          html: htmlWithTracking,
        })
      );
    }

    // Send to company - fetch admin emails from database
    console.log("🔍 Fetching admin emails from database...");
    const admins = await Admin.find({ 
      role: { $in: ["super_admin", "admin"] } 
    }).select("email");
    
    const adminEmails = admins.map(admin => admin.email).filter(Boolean);
    console.log(`📬 Found ${adminEmails.length} admin(s):`, adminEmails);
    
    if (adminEmails.length > 0) {
      const companyHTML = generateCompanyOrderNotification(order, user);
      // Send to all admins
      adminEmails.forEach(adminEmail => {
        console.log("📨 Preparing company email to:", adminEmail);
        emailPromises.push(
          sendEmail({
            to: adminEmail,
            subject: `🛒 New Order Received - Order #${order._id}`,
            html: companyHTML,
          })
        );
      });
    } else {
      console.log("⚠️ No admins found to send company notification");
    }

    console.log(`📮 Sending ${emailPromises.length} email(s)...`);
    const results = await Promise.all(emailPromises);

    // Check if all emails were sent successfully
    const allSuccess = results.every(result => result.success);
    const successCount = results.filter(r => r.success).length;
    
    console.log(`✅ ${successCount}/${emailPromises.length} emails sent successfully`);

    if (allSuccess) {
      // Update email tracking - sent successfully
      await Order.findByIdAndUpdate(order._id, {
        $set: {
          "emailTracking.confirmation.status": "sent",
          "emailTracking.confirmation.sentAt": new Date(),
        },
      });
      console.log("💾 Email tracking updated: status = sent");
    } else {
      throw new Error("Some emails failed to send");
    }
  } catch (error) {
    console.error("❌ Order confirmation emails failed:", error.message);
    // Update email tracking - failed
    await Order.findByIdAndUpdate(order._id, {
      $set: {
        "emailTracking.confirmation.status": "failed",
        "emailTracking.confirmation.failedAt": new Date(),
        "emailTracking.confirmation.error": error.message,
      },
    });
    console.log("💾 Email tracking updated: status = failed");
    throw error;
  }
}

/**
 * Add tracking pixel to email HTML
 */
function addTrackingPixel(html, orderId, emailType) {
  const trackingPixel = `<img src="${process.env.APP_URL || 'http://localhost:5000'}/api/email-tracking/pixel/${orderId}/${emailType}" width="1" height="1" style="display:none;" alt="" />`;
  // Insert before closing body tag
  return html.replace('</body>', `${trackingPixel}</body>`);
}

/**
 * Send status update emails
 */
async function sendStatusUpdateEmails(data) {
  const { order, user, previousStatus, updatedBy } = data;
  const emailPromises = [];

  console.log("\n🎯 Processing Status Update Emails");
  console.log("📦 Order ID:", order._id);
  console.log("👤 Customer:", user.name, `(${user.email})`);
  console.log("🔄 Status Change:", previousStatus, "→", order.status);

  // Update attempts for the queued email
  await Order.findOneAndUpdate(
    { _id: order._id, "emailTracking.statusUpdates.status": order.status },
    {
      $inc: { "emailTracking.statusUpdates.$.attempts": 1 },
      $set: { "emailTracking.statusUpdates.$.lastAttemptAt": new Date() },
    }
  );

  console.log("📦 Order:", order);


  try {
    // Send to customer
    if (user.email) {
      console.log("📨 Preparing customer status email to:", user.email);
      const customerHTML = generateCustomerStatusUpdate(
        order,
        user,
        previousStatus
      );
      // Add tracking pixel
      const htmlWithTracking = addTrackingPixel(customerHTML, order._id, `status-${order.status}`);
      emailPromises.push(
        sendEmail({
          to: user.email,
          subject: `Order Status Update - Order #${order._id} is now ${order.status.toUpperCase()}`,
          html: htmlWithTracking,
        })
      );
    }

    // Send to company - fetch admin emails from database
    console.log("🔍 Fetching admin emails from database...");
    const admins = await Admin.find({ 
      role: { $in: ["super_admin", "admin"] } 
    }).select("email");
    
    const adminEmails = admins.map(admin => admin.email).filter(Boolean);
    console.log(`📬 Found ${adminEmails.length} admin(s):`, adminEmails);
    
    if (adminEmails.length > 0) {
      const companyHTML = generateCompanyStatusUpdate(
        order,
        user,
        previousStatus,
        updatedBy
      );
      // Send to all admins
      adminEmails.forEach(adminEmail => {
        console.log("📨 Preparing company status email to:", adminEmail);
        emailPromises.push(
          sendEmail({
            to: adminEmail,
            subject: `📝 Order Status Updated - Order #${order._id} → ${order.status.toUpperCase()}`,
            html: companyHTML,
          })
        );
      });
    } else {
      console.log("⚠️ No admins found to send company notification");
    }

    console.log(`📮 Sending ${emailPromises.length} email(s)...`);
    const results = await Promise.all(emailPromises);
    
    const allSuccess = results.every(result => result.success);
    const successCount = results.filter(r => r.success).length;
    
    console.log(`✅ ${successCount}/${emailPromises.length} emails sent successfully`);

    if (allSuccess) {
      // Update email tracking - sent successfully
      await Order.findOneAndUpdate(
        { _id: order._id, "emailTracking.statusUpdates.status": order.status },
        {
          $set: {
            "emailTracking.statusUpdates.$.emailStatus": "sent",
            "emailTracking.statusUpdates.$.sentAt": new Date(),
          },
        }
      );
      console.log("💾 Email tracking updated: status = sent");
    } else {
      throw new Error("Some emails failed to send");
    }
  } catch (error) {
    console.error("❌ Status update emails failed:", error.message);
    // Update email tracking - failed
    await Order.findOneAndUpdate(
      { _id: order._id, "emailTracking.statusUpdates.status": order.status },
      {
        $set: {
          "emailTracking.statusUpdates.$.emailStatus": "failed",
          "emailTracking.statusUpdates.$.failedAt": new Date(),
          "emailTracking.statusUpdates.$.error": error.message,
        },
      }
    );
    console.log("💾 Email tracking updated: status = failed");
    throw error;
  }
}

/**
 * Send welcome email to new user
 */
async function sendWelcomeEmail(data) {
  console.log("\n🎯 Processing Welcome Email");
  const { user } = data;
  
  console.log("📊 Data received:", JSON.stringify(data, null, 2));
  
  if (!user) {
    console.error("❌ No user data provided");
    throw new Error("User data is missing");
  }
  
  console.log("👤 New User:", user.name, `(${user.email})`);

  try {
    if (user.email) {
      console.log("📨 Preparing welcome email to:", user.email);
      const welcomeHTML = generateWelcomeEmail(user);
      
      const result = await sendEmail({
        to: user.email,
        subject: `Welcome to Celiac Store! 🎉`,
        html: welcomeHTML,
      });

      if (result.success) {
        console.log("✅ Welcome email sent successfully");
      } else {
        throw new Error("Failed to send welcome email");
      }
    } else {
      console.error("❌ No email address found for user");
      throw new Error("User email is missing");
    }
  } catch (error) {
    console.error("❌ Welcome email failed:", error.message);
    throw error;
  }
}

/**
 * Send forgot password email with new password
 */
async function sendForgotPasswordEmail(data) {
  const { user, newPassword } = data;
  
  console.log("\n🎯 Processing Forgot Password Email");
  console.log("👤 User:", user.name, `(${user.email})`);
  console.log("🔑 New password generated");

  try {
    if (user.email) {
      console.log("📨 Preparing password reset email to:", user.email);
      const forgotPasswordHTML = generateForgotPasswordEmail(user, newPassword);
      
      const result = await sendEmail({
        to: user.email,
        subject: `Password Reset - Celic Store 🔐`,
        html: forgotPasswordHTML,
      });

      if (result.success) {
        console.log("✅ Password reset email sent successfully");
      } else {
        throw new Error("Failed to send password reset email");
      }
    }
  } catch (error) {
    console.error("❌ Password reset email failed:", error.message);
    throw error;
  }
}

// Worker event listeners
emailWorker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed successfully`);
});

emailWorker.on("failed", (job, err) => {
  console.error(`❌ Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);
});

emailWorker.on("error", (error) => {
  console.error("Worker error:", error);
});

console.log("📧 Email worker started and ready to process jobs");

module.exports = emailWorker;

