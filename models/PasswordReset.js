import mongoose from 'mongoose';

const ResetPasswordSchema = new mongoose.Schema({
userId:String,
resetString:String,
createdAt:Date,
expiresAt:Date
})

export default mongoose.model('PasswordReset', ResetPasswordSchema);