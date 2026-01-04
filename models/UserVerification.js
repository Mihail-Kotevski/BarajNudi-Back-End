import mongoose from "mongoose";

const UserVerificationSchema = new mongoose.Schema( {
  userId: { type: String, required: true },
  uniqueString: { type: String, required: true, unique: true },
  createdAt: Date,
  expiresAt: Date,
} );

export default mongoose.model("UserVerification", UserVerificationSchema );