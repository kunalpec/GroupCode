import nodemailer from "nodemailer";

const mailSender = async (email, title, body) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail", // ✅ ADD THIS
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"Online-VSCode" <${process.env.MAIL_USER}>`,
      to: email,
      subject: title,
      html: body,
    });

    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email.");
  }
};

export { mailSender };