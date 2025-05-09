import jwt from 'jsonwebtoken';
import sendMail from '../../config/mailgun.js';

const verifyEmail = async (request) => {
    try {
        const { email, role, enterprise_id } = request;

        // Generate a JWT token
        const token = jwt.sign({ email, role, enterprise_id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Confirmation URL
        const confirmationUrl = `${process.env.FRONTEND_URL}/emailconfirmation/${token}`;

        // Email content
        const subject = 'Verify Your Email';
        const text = `Hello, please verify your email by clicking the link: ${confirmationUrl}`;

        // Send the email using sendMail
        await sendMail(email, subject, text);
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

export default verifyEmail;