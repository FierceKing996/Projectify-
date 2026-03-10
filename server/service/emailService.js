const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

exports.sendSuperAdminAlert = async (userData) => {
    try {
        const mailOptions = {
            from: `"AgencyOS Alerts" <${process.env.EMAIL_USER}>`,
            to: process.env.ADMIN_EMAIL, // This sends it to you
            subject: `🚨 New Super Admin Request from ${userData.username}`,
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
                    <h2 style="color: #2563eb;">New Super Admin Request</h2>
                    <p>Hello Aditya,</p>
                    <p>A user has just requested Super Admin access from the dashboard.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p><strong>Username:</strong> ${userData.username}</p>
                    <p><strong>Email:</strong> ${userData.email}</p>
                    <p><strong>User ID:</strong> ${userData.userId}</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="color: #666; font-size: 12px;">
                        To approve this, log into your MongoDB database and change this user's role to 'admin'.
                    </p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("📧 Real email sent successfully! Message ID:", info.messageId);
        return info;
    } catch (error) {
        console.error("❌ Email sending failed:", error);
        throw error;
    }
};

/**
 * Send a workspace invitation email
 */
exports.sendInvitationEmail = async (toEmail, inviterName, workspaceTitle, acceptLink) => {
    const mailOptions = {
        from: `"YOUR TO-DO App" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: `${inviterName} invited you to collaborate on "${workspaceTitle}"`,
        html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
            <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700;">You've been invited!</h1>
            </div>
            <div style="padding: 32px 24px;">
                <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 8px;">
                    <strong>${inviterName}</strong> has invited you to collaborate on the workspace:
                </p>
                <div style="background: #f3f4f6; border-radius: 10px; padding: 14px 18px; margin: 16px 0; text-align: center;">
                    <span style="font-size: 18px; font-weight: 700; color: #1f2937;">${workspaceTitle}</span>
                </div>
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">
                    Click the button below to accept the invitation and start collaborating.
                </p>
                <div style="text-align: center;">
                    <a href="${acceptLink}" 
                       style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 12px 36px; border-radius: 50px; font-weight: 600; font-size: 15px;">
                        Accept Invitation
                    </a>
                </div>
                <p style="color: #9ca3af; font-size: 12px; margin-top: 28px; text-align: center;">
                    If you don't have an account yet, sign up first and then use this link.
                </p>
            </div>
        </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`📧 Invitation email sent to ${toEmail}: ${info.messageId}`);
        return info;
    } catch (err) {
        console.error(`❌ Failed to send invitation email to ${toEmail}:`, err.message);
        throw err;
    }
};