import { lectureModel } from "../models/lecture.model.js";



class LectureRepository {

    async deleteLecture(lectureId){
        return await lectureModel.findByIdAndDelete(lectureId)
    }
    async getLectureInfo(lectureId){
        return await lectureModel.findById(lectureId)
    }

    async getAllLectures(){
        return await lectureModel.find()
    }


}



export default new LectureRepository();