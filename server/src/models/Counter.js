import mongoose from 'mongoose';

/**
 * Counter: atomic sequence for asset tags AF-0001, AF-0002, ...
 * Each counter is a single doc keyed by _id. We use findOneAndUpdate with
 * $inc + upsert so concurrent registers never collide on the same tag.
 */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. 'assetTag'
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.model('Counter', counterSchema);

/**
 * Get the next asset tag in the sequence AF-0001, AF-0002, ...
 * Thread-safe under concurrent calls (MongoDB's atomic update).
 */
export async function getNextAssetTag() {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'assetTag' },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `AF-${String(counter.seq).padStart(4, '0')}`;
}
