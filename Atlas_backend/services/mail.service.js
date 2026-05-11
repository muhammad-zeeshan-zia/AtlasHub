const nodemailer = require("nodemailer");

const normalizeAppPassword = (raw) =>
  typeof raw === "string" ? raw.replace(/\s+/g, "") : "";

let transporterPromise = null;

const getTransporter = () => {
  const user = process.env.EMAIL_USER;
  const pass = normalizeAppPassword(process.env.EMAIL_PASS || "");

  if (!user || !pass) {
    return null;
  }

  if (!transporterPromise) {
    transporterPromise = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass }
    });
  }

  return transporterPromise;
};

exports.sendOtpEmail = async ({ to, subject, text, html }) => {
  const transport = getTransporter();
  if (!transport) {
    console.warn("EMAIL_USER / EMAIL_PASS not set; OTP email not sent.");
    return { skipped: true };
  }

  const from = process.env.EMAIL_FROM || `"Atlas Hub" <${process.env.EMAIL_USER}>`;

  await transport.sendMail({
    from,
    to,
    subject,
    text,
    html: html || `<p style="font-family:sans-serif;font-size:15px;">${String(text).replace(/\n/g, "<br>")}</p>`
  });

  return { skipped: false };
};
