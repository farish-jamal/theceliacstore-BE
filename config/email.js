const nodemailer = require("nodemailer");

exports.sendEmail = async emailOptions => {
   try {
      const transporter = nodemailer.createTransport({
         host: process.env.EMAIL_HOST,
         port: process.env.EMAIL_PORT,
         auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
         },
         secure: false,
         tls: {
            rejectUnauthorized: false,
            ciphers: 'SSLv3',
         },
      });
      await transporter.verify();
      const info = await transporter.sendMail(emailOptions);
      return info;
   } catch (error) {
      throw new Error(`Email sending failed: ${error.message}`);
   }
};


