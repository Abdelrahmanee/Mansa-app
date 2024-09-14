import { lectureModel } from "../../lecture/models/lecture.model.js";
import { userModel } from "../../user/models/user.model.js";





class onlinePaymentRepository {

    async getLectureInfo(lectureId){
        return await lectureModel.findById(lectureId)
    }
    async getUserInfo(studentId){
        return await userModel.findById(studentId)
    }

}



export default new onlinePaymentRepository();