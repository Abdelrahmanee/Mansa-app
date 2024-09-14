import { sendEmail } from "../../../utilies/email.js";
import { AppError, catchAsyncError } from "../../../utilies/error.js";
import { generateUniqueCode } from "../../../utilies/generateUniqueCode.js";
import { LECTURE_CODE_TEMPLATE } from "../../../utilies/htmlTemplate.js";
import { lectureModel } from "../../lecture/models/lecture.model.js";
import lectureService from "../../lecture/service/lecture.service.js";
import { userModel } from "../../user/models/user.model.js";

// paymentController.js
class PaymentController {
  constructor(paymentService) {
    this.paymentService = paymentService;
  }

  async createPayment(req, res) {
    const { lectureId } = req.body;
    const { _id: studentId } = req.user

    try {
      const session = await this.paymentService.createPaymentIntent(lectureId, studentId);
      res.status(201).json(session);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}
export const makeOnlineOrder = async (data) => {
  const { client_reference_id: userId, metadata: { lecture_id } , customer_email } = data;  // Correctly destructuring lecture_id and userId

  // Fetch user and lecture details
  const user = await userModel.findById(userId);
  const lecture = await lectureModel.findById(lecture_id);

  if (!user) throw new AppError("User not found", 404);
  if (!lecture) throw new AppError("Lecture not found", 404);

  const code = generateUniqueCode();
  if (!code) throw new AppError("Code is required", 400);
  
  // Generate the lecture code and store it
  const generatedCode = await lectureService.generateLectureCode({
    lectureId: lecture._id,  
    code,
    isUsed: false
  });
  
  console.log(user.email);
  console.log(user);
  // Send email to the user with the lecture code
  await sendEmail(
    user.email,
    "Lecture Code",
    LECTURE_CODE_TEMPLATE,
    generatedCode.code
  );
};

export default PaymentController;
