import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { ASSIGNABLE } from '../utils/roles.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Admin-only user directory + management.
 * Role changes live ONLY here (PATCH /:id/role); signup can never grant a role.
 */

/**
 * GET /api/users -> directory list.
 * Filters: ?search= (name/email) &role= &status= &department=
 */
export const listUsers = asyncHandler(async (req, res) => {
  const { search, role, status, department } = req.query;
  const filter = {};

  if (role) filter.role = role;
  if (status) filter.status = status;
  if (department) filter.department = department;
  if (search) {
    const rx = new RegExp(search.trim(), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const query = User.find(filter).sort({ createdAt: -1 });
  // Department model arrives in Module 2; only populate once it's registered.
  if (mongoose.models.Department) query.populate('department', 'name');
  const users = await query;

  res.json({ success: true, data: { users } });
});

/**
 * PATCH /api/users/:id/role  body { role } -> promote/demote.
 * The single place a role can change. 'admin' is not assignable here.
 */
export const setRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!ASSIGNABLE.includes(role)) throw new ApiError(400, 'Invalid role');
  if (req.params.id === req.user._id.toString()) {
    throw new ApiError(400, "You can't change your own role");
  }

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  user.role = role;
  await user.save();
  res.json({ success: true, data: { user } });
});

/** PATCH /api/users/:id/status  body { status } -> activate/deactivate. */
export const setStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (req.params.id === req.user._id.toString()) {
    throw new ApiError(400, "You can't change your own status");
  }

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  user.status = status;
  await user.save();
  res.json({ success: true, data: { user } });
});
