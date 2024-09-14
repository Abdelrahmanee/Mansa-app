import { AppError } from "../../../utilies/error.js";
import lectureService from "../service/lecture.service.js";

export const isLectureExists = async (req, res, next) => {
  const { lectureId } = req.body;
  const lecture = await lectureService.getLecture(lectureId);
  if (!lecture) {
    return next(new AppError("Lecture not found", 404));
  }
  next()
}