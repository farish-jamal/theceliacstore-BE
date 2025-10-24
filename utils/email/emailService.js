const nodemailer = require("nodemailer");
const emailConfig = require("../../config/email");

/**
 * Create reusable transporter
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure,
    auth: {
      user: emailConfig.auth.user,
      pass: emailConfig.auth.pass,
    },
  });
};

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string|Array} options.to - Recipient email(s)
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (optional)
 * @returns {Promise}
 */
const sendEmail = async (options) => {
  console.log("\n📧 ========== EMAIL SEND ATTEMPT ==========");
  console.log("📤 To:", options.to);
  console.log("📝 Subject:", options.subject);
  console.log("⏰ Time:", new Date().toISOString());
  
  try {
    console.log("🔧 Creating transporter...");
    
    // Check if email config is properly set
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      console.error("❌ Email configuration missing - USER or PASSWORD not set");
      return {
        success: false,
        error: "Email configuration missing - USER or PASSWORD not set",
      };
    }
    
    if (!emailConfig.from.email) {
      console.error("❌ Email configuration missing - FROM EMAIL not set");
      return {
        success: false,
        error: "Email configuration missing - FROM EMAIL not set",
      };
    }
    
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || "", // Fallback to empty string if no text provided
    };

    console.log("📨 From:", mailOptions.from);
    console.log("🔌 SMTP Host:", emailConfig.host);
    console.log("🔌 SMTP Port:", emailConfig.port);
    console.log("👤 SMTP User:", emailConfig.auth.user);
    console.log("🚀 Sending email...");

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    console.log("✅ EMAIL SENT SUCCESSFULLY!");
    console.log("📬 Message ID:", info.messageId);
    console.log("📊 Response:", info.response);
    console.log("=========================================\n");

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("❌ ========== EMAIL SEND FAILED ==========");
    console.error("🐛 Error:", error.message);
    console.error("📋 Error Code:", error.code);
    console.error("🔍 Error Details:", error);
    console.error("=========================================\n");
    
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Send email to multiple recipients
 * @param {Array} recipients - Array of recipient emails
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @returns {Promise}
 */
const sendBulkEmail = async (recipients, subject, html) => {
  const promises = recipients.map((recipient) =>
    sendEmail({ to: recipient, subject, html })
  );
  return Promise.allSettled(promises);
};

module.exports = {
  sendEmail,
  sendBulkEmail,
};

