import { sendEmail } from "../../../utilies/email.js";




class EmailService {
    async sendEmailToUser(to, subject, template, userName) {
        // Implementation for sending email
        await sendEmail(to, subject, template, userName);
    }
}

export const emailService = new EmailService();