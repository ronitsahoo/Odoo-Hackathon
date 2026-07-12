import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

import { connectDB } from './config/db.js';
import { initSockets } from './sockets/index.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import itemRoutes from './routes/item.routes.js';
import commentRoutes from './routes/comment.routes.js';
import requestRoutes from './routes/request.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import adminRoutes from './routes/admin.routes.js';
import departmentRoutes from './routes/department.routes.js';
import categoryRoutes from './routes/category.routes.js';
import assetRoutes from './routes/asset.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();
const server = http.createServer(app);

// --- Core middleware ---
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve uploaded images statically (multer writes to server/uploads).
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- Health check ---
app.get('/api/health', (req, res) =>
  res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } })
);

// --- API routes (route -> controller -> model) ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/assets', assetRoutes);

// --- 404 + central error handler (must be last) ---
app.use(notFound);
app.use(errorHandler);

// --- Boot: DB -> sockets -> listen ---
async function start() {
  await connectDB();
  await initSockets(server, CLIENT_ORIGIN);
  server.listen(PORT, () => {
    console.log(`✓ API + Socket.io on http://localhost:${PORT}`);
    console.log(`  CORS origin: ${CLIENT_ORIGIN}`);
  });
}

start();
