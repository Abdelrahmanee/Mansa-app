


import Logo from "../models/logo.model.js";

class LogoRepository {
    async saveLogo(logoData){
        const logo = new Logo(logoData);
        await logo.save();
        return logo
    }
    async findLogoByLecture(lectureId){
        return await Logo.findOne({lectureId})
    }
    async findLogoById(logoId){
        return await Logo.findById(logoId)
    }
    async deleteLogoByPublicId(publicId){
        return await Logo.deleteOne({publicId})
    }
}
export default new LogoRepository();