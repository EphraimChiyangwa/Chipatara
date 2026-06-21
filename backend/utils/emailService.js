const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  try {
    await transporter.sendMail({
      from: `"Chipatara Health" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("Email failed:", err.message);
  }
};

const emailTemplates = {
  appointmentBooked: (patientName, doctorName, date, reason) => ({
    subject: "Appointment Booked — Chipatara",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
        <div style="background:#3B5BDB;padding:24px 32px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:22px;">Chipatara</h1>
          <p style="color:#c7d4ff;margin:4px 0 0;font-size:13px;">Healthcare Without Distance</p>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <h2 style="color:#1B1B2F;margin:0 0 16px;">Appointment Confirmed ✓</h2>
          <p style="color:#6B7280;">Hi <strong>${patientName}</strong>,</p>
          <p style="color:#6B7280;">Your appointment has been booked successfully.</p>
          <div style="background:#EBF0FF;border-radius:10px;padding:16px;margin:20px 0;">
            <p style="margin:0 0 8px;color:#1B1B2F;"><strong>Doctor:</strong> Dr. ${doctorName}</p>
            <p style="margin:0 0 8px;color:#1B1B2F;"><strong>Date:</strong> ${new Date(date).toLocaleString()}</p>
            <p style="margin:0;color:#1B1B2F;"><strong>Reason:</strong> ${reason}</p>
          </div>
          <p style="color:#6B7280;font-size:13px;">The doctor will confirm your appointment shortly.</p>
        </div>
      </div>`,
  }),

  appointmentStatusUpdate: (recipientName, status, doctorName, patientName, date) => ({
    subject: `Appointment ${status.charAt(0).toUpperCase() + status.slice(1)} — Chipatara`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
        <div style="background:#3B5BDB;padding:24px 32px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:22px;">Chipatara</h1>
          <p style="color:#c7d4ff;margin:4px 0 0;font-size:13px;">Healthcare Without Distance</p>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <h2 style="color:#1B1B2F;margin:0 0 16px;">Appointment ${status.charAt(0).toUpperCase() + status.slice(1)}</h2>
          <p style="color:#6B7280;">Hi <strong>${recipientName}</strong>,</p>
          <p style="color:#6B7280;">Your appointment status has been updated to <strong>${status}</strong>.</p>
          <div style="background:#EBF0FF;border-radius:10px;padding:16px;margin:20px 0;">
            <p style="margin:0 0 8px;color:#1B1B2F;"><strong>Patient:</strong> ${patientName}</p>
            <p style="margin:0 0 8px;color:#1B1B2F;"><strong>Doctor:</strong> Dr. ${doctorName}</p>
            <p style="margin:0;color:#1B1B2F;"><strong>Date:</strong> ${new Date(date).toLocaleString()}</p>
          </div>
        </div>
      </div>`,
  }),

  appointmentReminder: (patientName, doctorName, date) => ({
    subject: "Appointment Reminder — 1 Hour — Chipatara",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
        <div style="background:#3B5BDB;padding:24px 32px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:22px;">Chipatara</h1>
          <p style="color:#c7d4ff;margin:4px 0 0;font-size:13px;">Healthcare Without Distance</p>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <h2 style="color:#1B1B2F;margin:0 0 16px;">⏰ Appointment in 1 Hour</h2>
          <p style="color:#6B7280;">Hi <strong>${patientName}</strong>,</p>
          <p style="color:#6B7280;">This is a reminder that your appointment is coming up in approximately <strong>1 hour</strong>.</p>
          <div style="background:#EBF0FF;border-radius:10px;padding:16px;margin:20px 0;">
            <p style="margin:0 0 8px;color:#1B1B2F;"><strong>Doctor:</strong> Dr. ${doctorName}</p>
            <p style="margin:0;color:#1B1B2F;"><strong>Time:</strong> ${new Date(date).toLocaleString()}</p>
          </div>
          <p style="color:#6B7280;font-size:13px;">Please be ready for your video consultation. You can join from the Chipatara app.</p>
        </div>
      </div>`,
  }),

  passwordReset: (name, resetLink) => ({
    subject: "Reset Your Password — Chipatara",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
        <div style="background:#3B5BDB;padding:24px 32px;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:22px;">Chipatara</h1>
          <p style="color:#c7d4ff;margin:4px 0 0;font-size:13px;">Healthcare Without Distance</p>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
          <h2 style="color:#1B1B2F;margin:0 0 16px;">Reset Your Password</h2>
          <p style="color:#6B7280;">Hi <strong>${name}</strong>,</p>
          <p style="color:#6B7280;">We received a request to reset your password. Click the button below — this link expires in 1 hour.</p>
          <a href="${resetLink}" style="display:inline-block;background:#3B5BDB;color:#fff;padding:12px 28px;border-radius:50px;text-decoration:none;font-weight:600;margin:20px 0;">Reset Password</a>
          <p style="color:#9CA3AF;font-size:12px;margin-top:24px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      </div>`,
  }),
};

module.exports = { sendEmail, emailTemplates };
