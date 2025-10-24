const nodemailer = require("nodemailer");

exports.sendEmail = async (emailOptions) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER, // your Brevo email/login
        pass: process.env.EMAIL_PASSWORD, // API key here
      },
      tls: { rejectUnauthorized: false },
    });

    await transporter.verify();
    console.log("✅ SMTP login successful");

    const info = await transporter.sendMail(emailOptions);
    return info;
  } catch (error) {
    throw new Error(`Email sending failed: ${error.message}`);
  }
};
