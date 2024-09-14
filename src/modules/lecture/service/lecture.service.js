import { lectureModel } from "../models/lecture.model.js";
import { LectureAccessCodeModel } from "../models/LectureAccessCode.model .js";
import cloudinary from 'cloudinary';
import { v4 as uuid4 } from 'uuid';
import { StudentLectureModel } from "../models/StudentLecture.model.js";
import videoRepository from "../repos/video.repository.js";
import pdfRepository from "../repos/pdf.repository.js";
import { AppError } from "../../../utilies/error.js";
import logoRepository from "../repos/logo.repository.js";
import lectureRepository from "../repos/lecture.repository.js";
import { userModel } from "../../user/models/user.model.js";


class LectureService {

    async uploadLogo(logo, lectureId) {

        if (!logo) return { logoURL: '', publicId: '' };

        const uploadResponse = await new Promise((resolve, reject) => {
            const stream = cloudinary.v2.uploader.upload_stream(
                { folder: 'Mansa/Lectures', public_id: uuid4() },
                async (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                    const logoData = {
                        lectureId,
                        publicId: result.public_id,
                        logoURL: result.secure_url,
                    }
                    await logoRepository.saveLogo(logoData)
                }
            );

            stream.end(logo.buffer);
        });


        return {
            logoURL: uploadResponse.secure_url,
            publicId: uploadResponse.public_id
        };
    }
    // Upload Video
    async uploadVideo(file, lectureId) {

        try {
            const result = await cloudinary.v2.uploader.upload(file.path, {
                resource_type: 'video', // This ensures the file is treated as a video
                folder: 'lectures/videos'
            });
            const videoData = {
                lectureId,
                publicId: result.public_id,
                videoURL: result.secure_url,
            }
            const video = await videoRepository.saveVideo(videoData)
            console.log(video);
            return {
                videoURL: result.secure_url,
                publicId: result.public_id,
                video
            };
        } catch (error) {
            throw new AppError('Video upload failed', 500);
        }
    }

    // Upload PDF
    async uploadPDF(file, lectureId) {
        try {
            const result = await cloudinary.v2.uploader.upload(file.path, {
                resource_type: 'raw', // PDFs are usually treated as raw files
                folder: 'lectures/pdfs'
            });
            const pdfData = {
                lectureId,
                PDFURL: result.secure_url,
                publicId: result.public_id
            }
            const pdf = await pdfRepository.savePdf(pdfData)
            return {
                PDFURL: result.secure_url,
                publicId: result.public_id,
                pdf
            };
        } catch (error) {

            throw new AppError('PDF upload failed', 500);
        }
    }
    async createLecture(data) {
        return await lectureModel.create(data)
    }

    async generateLectureCode(data) {
        return await LectureAccessCodeModel.create(data)
    }

    async hasAccess({ studentId, lectureId }) {
        return await StudentLectureModel.findOne({ studentId, lectureId });
    }


    async checkCodeIsGenerated({ lectureId, code }) {
        return await LectureAccessCodeModel.findOne({ code, lectureId })
    }
    async checkCodeIsAccessed({ lectureId, code, isUsed }) {
        return await LectureAccessCodeModel.findOne({ lectureId, code, isUsed: false })
    }


    async linkStudentWithLecture({ studentId, lectureId, accessCodeId, hasPermanentAccess }) {
        await StudentLectureModel.create({ studentId, lectureId, accessCodeId, hasPermanentAccess, });
        await userModel.findByIdAndUpdate(
            studentId,
            { $push: { lectures: { lectureId } } } 
        );

    }


    async updateStudentLecture({ studentLecture, accessCodeID }) {
        studentLecture.hasPermanentAccess = true;
        studentLecture.accessCodeId = accessCodeID;
        await studentLecture.save();
    }


    async getLecture(id) {
        return await lectureModel.findOne({ _id: id })
    }

    async getAllLectures() {
        return lectureRepository.getAllLectures()
    }
}
export default new LectureService();