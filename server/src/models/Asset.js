import mongoose from 'mongoose';

/**
 * Asset: the core asset-registry resource.
 * Cloned from Item.js and adapted for asset lifecycle management.
 */
const assetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssetCategory',
      required: true,
      index: true,
    },
    assetTag: { type: String, required: true, unique: true, index: true }, // AF-0001, AF-0002, ...
    serialNumber: { type: String, trim: true, default: '' },
    acquisitionDate: { type: Date, default: null },
    acquisitionCost: { type: Number, default: 0 }, // for reports/ranking only
    condition: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
      index: true,
    },
    photos: [{ type: String }], // upload paths
    documents: [{ type: String }], // upload paths (optional)
    isBookable: { type: Boolean, default: false },

    // Lifecycle status (registration starts at Available; allocation/maintenance transition it)
    status: {
      type: String,
      enum: [
        'Available',
        'Allocated',
        'Reserved',
        'Under Maintenance',
        'Lost',
        'Retired',
        'Disposed',
      ],
      default: 'Available',
      index: true,
    },

    // Custom field values keyed by the category's custom field labels
    // e.g. { "Warranty (months)": 12 }
    customFieldValues: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} },

    // Populated by allocation / transfer
    currentHolder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    expectedReturnDate: { type: Date, default: null },
    allocationHistory: { type: Array, default: [] }, // appended on allocate/transfer/return

    // Populated by maintenance
    maintenanceHistory: { type: Array, default: [] }, // appended on maintenance transitions
  },
  { timestamps: true }
);

// Compound index for common list queries
assetSchema.index({ status: 1, createdAt: -1 });
// Text search across tag, serial, name (search box + QR scan)
assetSchema.index({ assetTag: 'text', serialNumber: 'text', name: 'text' });

export const Asset = mongoose.model('Asset', assetSchema);
