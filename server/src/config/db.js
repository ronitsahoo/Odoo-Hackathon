import mongoose from 'mongoose';

/**
 * Connect to MongoDB. Reads MONGODB_URI from env (local by default,
 * swap to an Atlas connection string with zero code changes).
 */
export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('✗ MONGODB_URI is not set. Copy server/.env.example to server/.env.');
    process.exit(1);
  }

  mongoose.connection.on('connected', () => console.log('✓ MongoDB connected'));
  mongoose.connection.on('error', (err) => console.error('✗ MongoDB error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('… MongoDB disconnected'));

  try {
    await mongoose.connect(uri);
  } catch (err) {
    console.error('✗ Could not connect to MongoDB:', err.message);
    console.error('  Is mongod running? Start it locally, or set MONGODB_URI to an Atlas URI.');
    process.exit(1);
  }
}
