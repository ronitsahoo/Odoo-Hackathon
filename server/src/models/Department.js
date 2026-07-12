import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Department name is required'], trim: true },
    head: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    parentDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

export const Department = mongoose.model('Department', departmentSchema);
