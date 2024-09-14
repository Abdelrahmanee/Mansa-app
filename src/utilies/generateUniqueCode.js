

import otpGenerator from 'otp-generator';

export const generateUniqueCode = () => {
	return otpGenerator.generate(12, {
		digits: true,
		upperCaseAlphabets: false,
		specialChars: false,
		lowerCaseAlphabets: true,
	});
};
