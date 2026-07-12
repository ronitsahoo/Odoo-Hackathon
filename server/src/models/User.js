import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from '../utils/roles.js';

/**
 * User: the account behind every action.
 * Roles are a stored enum (see utils/roles.js); "guest" is the absence of a
 * token and is never persisted. New signups are always 'employee'; privileged
 * roles are only granted by an admin via the user-management API.
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ROLES, default: 'employee' },
    // Nullable; Module 2 (Departments) fills this in.
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    // Account gate: an admin can deactivate a user to block sign-in.
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 300 },
    isPublic: { type: Boolean, default: true }, // profile visible to others
    isBanned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Hash the password whenever it is set/changed.
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Never leak the password hash in JSON responses.
userSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export const User = mongoose.model('User', userSchema);
