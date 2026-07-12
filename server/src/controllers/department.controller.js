import { Department } from '../models/Department.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/** GET /api/departments — any authenticated user (for dropdowns in Screens 4 & 5). */
export const getDepartments = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const departments = await Department.find(filter)
    .populate('head', 'name email')
    .populate('parentDepartment', 'name')
    .sort({ createdAt: -1 });

  res.json({ success: true, data: { departments } });
});

/** POST /api/departments — admin only. */
export const createDepartment = asyncHandler(async (req, res) => {
  const { name, head, parentDepartment, status } = req.body;

  // Auto-promote head to dept_head if they aren't already dept_head or admin.
  if (head) {
    const headUser = await User.findById(head);
    if (headUser && !['dept_head', 'admin'].includes(headUser.role)) {
      headUser.role = 'dept_head';
      await headUser.save();
    }
  }

  const department = await Department.create({ name, head: head || null, parentDepartment: parentDepartment || null, status });
  await department.populate('head', 'name email');
  await department.populate('parentDepartment', 'name');

  res.status(201).json({ success: true, data: { department } });
});

/** PATCH /api/departments/:id — admin only. Edit fields + status toggle. */
export const updateDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) throw new ApiError(404, 'Department not found');

  const { name, head, parentDepartment, status } = req.body;

  // Reject self-referencing parent.
  if (parentDepartment && parentDepartment === req.params.id) {
    throw new ApiError(400, 'A department cannot be its own parent');
  }

  // Cycle detection: walk the parent chain from the proposed parent.
  if (parentDepartment) {
    let current = await Department.findById(parentDepartment);
    const visited = new Set([req.params.id]);
    while (current) {
      if (visited.has(current._id.toString())) {
        throw new ApiError(400, 'Circular parent reference detected');
      }
      visited.add(current._id.toString());
      current = current.parentDepartment
        ? await Department.findById(current.parentDepartment)
        : null;
    }
  }

  // Auto-promote head.
  if (head) {
    const headUser = await User.findById(head);
    if (headUser && !['dept_head', 'admin'].includes(headUser.role)) {
      headUser.role = 'dept_head';
      await headUser.save();
    }
  }

  if (name !== undefined) department.name = name;
  if (head !== undefined) department.head = head || null;
  if (parentDepartment !== undefined) department.parentDepartment = parentDepartment || null;
  if (status !== undefined) department.status = status;

  await department.save();
  await department.populate('head', 'name email');
  await department.populate('parentDepartment', 'name');

  res.json({ success: true, data: { department } });
});
