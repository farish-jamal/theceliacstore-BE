const nodemailer = require("nodemailer");

exports.sendEmail = async (emailOptions) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_PORT == 465, // true for 465, false for 587
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false, // ignore self-signed issues
      },
    });
    await transporter.verify();
    const info = await transporter.sendMail(emailOptions);
    return info;
  } catch (error) {
    throw new Error(`Email sending failed: ${error.message}`);
  }
};
