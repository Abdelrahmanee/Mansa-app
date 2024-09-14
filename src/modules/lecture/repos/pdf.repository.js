
// repositories/pdfRepository.js

import Pdf from "../models/pdf.model.js";

class PdfRepository {
    // Save pdf to the database
    async savePdf(pdfData) {
        const pdf = new Pdf(pdfData);
        await pdf.save();
        return pdf;
    }

    // Find pdfs by lectureId (optional, for retrieving pdfs later)
    async findPdfsByLecture(lectureId) {
        return await Pdf.find({ lectureId });
    }

    // Find a single pdf by ID (optional)
    async findPdfById(pdfId) {
        return await Pdf.findById(pdfId);
    }

    // Delete a pdf by publicId (optional, for pdf deletion)
    async deletePdfByPublicId(publicId) {
        return await Pdf.deleteOne({ publicId });
    }
}

export default new PdfRepository();
