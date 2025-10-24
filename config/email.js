const nodemailer = require("nodemailer");

exports.sendEmail = async (emailOptions) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_PORT == 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
    await transporter.verify();
    console.log("Attempting SMTP connection to:", process.env.EMAIL_HOST, process.env.EMAIL_PORT);
    const info = await transporter.sendMail(emailOptions);
    console.log("✅ Email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    throw new Error(`Email sending failed: ${error.message}`);
  }
};
