import nodemailer from 'nodemailer';
import otpGenerator from 'otp-generator';
import dotenv from 'dotenv'
dotenv.config()

const transporter = nodemailer.createTransport({
	service: 'gmail', // or your email service provider
	auth: {
		user: process.env.EMAIL, // Your email
		pass: process.env.EMAIL_PASSWORD, // Your email password
	},
});

/**
 * Send an email with a dynamic HTML template.
 * @param {string} to - The recipient email address.
 * @param {string} subject - The subject of the email.
 * @param {Function} htmlTemplateFunc - The template function that generates HTML content.
 * @param {Object} templateData - The data to be passed to the template function.
 */
export const sendEmail = async (to, subject, htmlTemplateFunc, templateData) => {
	try {
		// Generate HTML from the template function
		const htmlContent = htmlTemplateFunc(templateData);

		// Send the email
		const mailOptions = {
			from: process.env.EMAIL, // sender address
			to: to, // recipient address
			subject: subject, // Subject line
			html: htmlContent, // HTML body content
		};

		await transporter.sendMail(mailOptions);
		console.log('Email sent successfully!');
	} catch (error) {
		console.error('Error sending email:', error);
	}
};
export const generateOTP = () => {
	return otpGenerator.generate(6, {
		digits: true,
		upperCaseAlphabets: false,
		specialChars: false,
		lowerCaseAlphabets: false
	});
};
