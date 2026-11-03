// backend/src/models/User.js

import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 320,
      unique: true,
      index: true,
    },
    passwordHash: { type: String, required: true, trim: true, maxlength: 255 },
    role: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: ['admin'],
      default: 'admin',
    },
  },
  {
    collection: 'users',
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

UserSchema.index({ email: 1 }, { unique: true, name: 'uq_users_email' });

export default mongoose.models.User || mongoose.model('User', UserSchema);
