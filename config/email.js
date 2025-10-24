require("dotenv").config();

const emailConfig = {
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  from: {
    name: process.env.EMAIL_FROM_NAME || "Celic Store",
    email: process.env.EMAIL_FROM_EMAIL,
  },
  tls: {
    rejectUnauthorized: false,
    ciphers: "SSLv3",
  },
};

module.exports = emailConfig;

// exports.sendEmail = async emailOptions => {
//    try {
//       const transporter = nodemailer.createTransport({
//          host: process.env.EMAIL_HOST,
//          port: process.env.EMAIL_PORT,
//          auth: {
//             user: process.env.EMAIL_USER,
//             pass: process.env.EMAIL_PASSWORD,
//          },
//          secure: false,
//          tls: {
//             rejectUnauthorized: false,
//             ciphers: 'SSLv3',
//          },
//       });
//       await transporter.verify();
//       const info = await transporter.sendMail(emailOptions);
//       return info;
//    } catch (error) {
//       throw new Error(`Email sending failed: ${error.message}`);
//    }
// };
