import { AppError, catchAsyncError } from "../../../utilies/error.js";
import { lectureModel } from "../models/lecture.model.js";
import { v2 as cloudinary } from 'cloudinary';
import LectureService from "../service/lecture.service.js";
import mongoose from "mongoose";
import lectureService from "../service/lecture.service.js";
import { generateUniqueCode } from "../../../utilies/generateUniqueCode.js";
import path from 'path'
import { fileURLToPath } from 'url';


// Get the equivalent of __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export const addLecture = catchAsyncError(async (req, res, next) => {

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!req.user) throw new AppError("you must be logged in", 498)
    // Create the lecture document without the logo first
    const lectureData = { ...req.body, teacherId: req.user._id };
    const lecture = await lectureService.createLecture(lectureData, session);

    console.log(req.files.pdfs[0].cloudinaryResult);


    // if (!req.file) throw new AppError('No file uploaded', 400)
    const { logoURL } = await LectureService.uploadLogo(req.files.logo[0], lecture._id)

    if (!logoURL) throw new AppError('Logo not found', 404)

    // Update the lecture document with the logo URL if the upload was successful
    lecture.logo = logoURL;

    // Upload videos if provided
    if (req.files && req.files.videos) {
      const videoPromises = req.files.videos.map(file =>
        LectureService.uploadVideo(file.cloudinaryResult.secure_url, lecture._id, file.cloudinaryResult.public_id)
      );
      const videoUploadResults = await Promise.all(videoPromises);

      // Extract video URLs and update the lecture
      const videoURLs = videoUploadResults.map(result => result.videoURL);
      lecture.videos = videoURLs;

    }

    // Upload PDFs if provided
    if (req.files && req.files.pdfs) {
      const pdfPromises = req.files.pdfs.map(file =>
        LectureService.uploadPDF(file.cloudinaryResult.secure_url, lecture._id, file.cloudinaryResult.public_id)
      );
      const pdfUploadResults = await Promise.all(pdfPromises);

      console.log(pdfUploadResults);


      // Extract PDF URLs and update the lecture
      const pdfURLs = pdfUploadResults.map(result => result.PDFURL);
      lecture.pdfs = pdfURLs;

    }
    await lecture.save({ session });



    // Commit the transaction if everything is successful
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      status: "success",
      message: 'Lecture is added successfully',
      data: lecture
    });

  } catch (error) {
    // If any operation fails, abort the transaction and rollback
    await session.abortTransaction();

    // Delete the lecture document if it was created but image upload failed
    if (error.message === 'Logo upload failed' && lecture) {
      await lecture.remove({ session });
    }

    // Cleanup uploaded videos and PDFs from Cloudinary
    if (req.files && req.files.videos) {
      await Promise.all(req.files.videos.map(async (file) => {
        try {
          console.log(file.cloudinaryResult.public_id);
          await cloudinary.uploader.destroy(file.cloudinaryResult.public_id, { resource_type: 'video' });
        } catch (error) {
          return next(new AppError('Error deleting video from Cloudinary', 500));
        }
      }));
    }


    if (req.files && req.files.pdfs) {
      await Promise.all(req.files.pdfs.map(async (file) => {
        try {
          console.log(file.cloudinaryResult.public_id);
          await cloudinary.uploader.destroy(file.cloudinaryResult.public_id, { resource_type: 'raw' });
        } catch (error) {
          return next(new AppError('Error deleting video from Cloudinary', 500));
        }
      }));
    }

    session.endSession();
    res.status(500).json({
      status: "fail",
      message: error.message
    });
  }

});


export const getLectureById = catchAsyncError(async (req, res, next) => {

  const { lectureId } = req.params;

  try {

    const lecture = await lectureService.getLecture(lectureId)

    if (!lecture) throw new AppError('lecture not found', 404)

    res.status(200).json({
      status: "success",
      data: lecture
    });
  } catch (error) {
    return next(new AppError(error.message, 500))
  }

});


export const generateLectureCode = catchAsyncError(async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { lectureId } = req.body
    const code = generateUniqueCode();

    if (!code) throw new AppError("Code is required", 400)

    const generatedCode = await lectureService.generateLectureCode({ lectureId, code, isUsed: false }, session, session)

    res.status(200).json({
      status: "success",
      message: 'Lecture code generated successfully',
      data: generatedCode
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return next(new AppError(error.message, 500))
  }

})


export const deleteLecture = catchAsyncError((req, res, next) => {

  const { lectureId } = req.params
})

export const checkStudentAccess = catchAsyncError(async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { lectureId } = req.body;

    // Check if the student already has access to the lecture
    const studentLecture = await lectureService.hasAccess({ studentId, lectureId });

    if (studentLecture && studentLecture.hasPermanentAccess) {
      // If the student has permanent access, allow access
      return res.status(200).json({
        status: "success",
        message: "Already have Access.",
        hasAccess: true,
      });
    }

    // If no permanent access, require code input
    return res.status(400).json({
      status: "fail",
      message: "Access code is required.",
      hasAccess: false,
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
});

export const grantStudentAccess = catchAsyncError(async (req, res, next) => {
  try {
    const studentId = req.user._id;
    const { lectureId, code } = req.body;



    // Check if the student has access (this check assumes no permanent access)
    const studentLecture = await lectureService.hasAccess({ studentId, lectureId });

    if (!code) {
      // If no code is provided, return an error since they don't have access
      return res.status(400).json({
        status: "fail",
        message: "Access code is required.",
      });
    }

    // Check if the code is generated for this lecture
    const codeIsGenerated = await lectureService.checkCodeIsGenerated({ lectureId, code });
    if (!codeIsGenerated) {
      return res.status(403).json({
        status: "fail",
        message: "Invalid code for this lecture",
      });
    }

    // Check if the code is valid and hasn't been used
    const codeIsNotAccessed = await lectureService.checkCodeIsAccessed({ lectureId, code, isUsed: false });
    if (!codeIsNotAccessed) {
      return res.status(403).json({
        status: "fail",
        message: "Code is already used",
      });
    }

    // Mark the code as used
    codeIsNotAccessed.isUsed = true;
    await codeIsNotAccessed.save();

    // Grant permanent access if it's the student's first time accessing the lecture
    if (!studentLecture) {
      const data = {
        studentId,
        lectureId,
        accessCodeId: codeIsNotAccessed._id,
        hasPermanentAccess: true,
      };
      await lectureService.linkStudentWithLecture(data);
    } else {
      // Update the student's lecture record with the used code
      await lectureService.updateStudentLecture({
        studentLecture,
        accessCodeID: codeIsNotAccessed._id,
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Access Approved.",
    });
  } catch (error) {
    return next(new AppError(error.message, 500));
  }
});



// export const accessLecture = catchAsyncError(async (req, res, next) => {
//   try {
//     const studentId = req.user._id
//     const { lectureId, code } = req.body;

//     const studentLecture = await lectureService.hasAccess({ studentId, lectureId })

//     if (studentLecture) {
//       // If the student has permanent access, allow access
//       if (studentLecture.hasPermanentAccess) {
//         return res.status(200).json({ status: "success", message: "Already have Access ." ,hasAccess: true});
//       }
//     }


//     // If the student doesn't have permanent access, then require the code
//     if (!code) {
//       // If no code is provided, return an error since they don't have access
//       return res.status(400).json({ status: "fail", message: "Access code is required." ,hasAccess: false});
//     }

//     // If the code is generated
//     const codeIsGenerated = await lectureService.checkCodeIsGenerated({ lectureId, code })

//     if (!codeIsGenerated) {
//       return res.status(403).json({ status: "fail", message: "Invalid code", hasAccess: false });
//     }
//     // If the studentLecture does not exist or permanent access is not granted, verify the code
//     const codeIsNotAccessed = await lectureService.checkCodeIsAccessed({ lectureId, code, isUsed: false })

//     if (!codeIsNotAccessed) {
//       return res.status(403).json({ status: "fail", message: "Code is already Used" ,hasAccess: false});
//     }

//     // Mark the code as used
//     codeIsNotAccessed.isUsed = true;
//     await codeIsNotAccessed.save();

//     // Record the student's access and grant permanent access
//     if (!studentLecture) {
//       const data = {
//         studentId,
//         lectureId,
//         accessCodeId: codeIsNotAccessed._id,
//         hasPermanentAccess: true,
//       }

//       await lectureService.linkStudentWithLecture(data);
//     } else {
//       await lectureService.updateStudentLecture({ studentLecture, accessCodeID: codeIsNotAccessed._id });
//     }

//     return res.status(200).json({status: 'success', message: "Access Approved." ,hasAccess: true});



//   } catch (error) {
//     return next(new AppError(error.message, 500))
//   }

// })


export const getAllLectures = catchAsyncError(async (req, res, next) => {
  try {
    const lectures = await lectureService.getAllLectures()
    res.status(200).json({
      message: "success",
      data: lectures
    });
  }
  catch (error) {
    return next(new AppError(error.message, 500))
  }
})