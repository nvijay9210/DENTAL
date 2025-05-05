const { CustomError } = require('../middlewares/CustomeError')
const userService=require('../services/userService')


exports.createUserValidation=async(details)=>{
    const user=await userService.getUserByPhoneNumber(details.mobile)
    if(user) throw new CustomError('MobileNumber Already Exists',409)
}
exports.updateUserValidation=async(details,userId)=>{
    const user=await userService.getExcludeUserByPhoneNumberAndUserId(details.mobile,userId)
  
    if(user) throw new CustomError('MobileNumber Already Exists',409)
}