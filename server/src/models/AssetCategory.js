import mongoose from 'mongoose';

const customFieldSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    type: { type: String, enum: ['text', 'number', 'date'], required: true },
  },
  { _id: false }
);

const assetCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Category name is required'], unique: true, trim: true },
    customFields: { type: [customFieldSchema], default: [] },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

export const AssetCategory = mongoose.model('AssetCategory', assetCategorySchema);
