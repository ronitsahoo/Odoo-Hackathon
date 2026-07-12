import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import { User } from './src/models/User.js';
import { Department } from './src/models/Department.js';
import { AssetCategory } from './src/models/AssetCategory.js';
import { Asset } from './src/models/Asset.js';
import { Counter } from './src/models/Counter.js';
import { Allocation } from './src/models/Allocation.js';
import { Transfer } from './src/models/Transfer.js';
import { MaintenanceRequest } from './src/models/MaintenanceRequest.js';

/**
 * Wipe and reseed the database with a demo dataset for AssetFlow.
 * Run with: npm run seed
 */
async function seed() {
  await connectDB();
  console.log('… clearing existing data');
  await Promise.all([
    User.deleteMany({}),
    Department.deleteMany({}),
    AssetCategory.deleteMany({}),
    Asset.deleteMany({}),
    Counter.deleteMany({}),
    Allocation.deleteMany({}),
    Transfer.deleteMany({}),
    MaintenanceRequest.deleteMany({}),
  ]);

  // --- Users ---
  const admin = await User.create({
    name: 'Admin',
    email: 'admin@demo.com',
    password: 'admin1234',
    role: 'admin',
    bio: 'Platform administrator.',
  });
  const manager = await User.create({
    name: 'Maya Manager',
    email: 'manager@demo.com',
    password: 'manager1234',
    role: 'asset_manager',
    bio: 'Keeps the asset catalogue in order.',
  });
  const head = await User.create({
    name: 'Devi Head',
    email: 'head@demo.com',
    password: 'head1234',
    role: 'dept_head',
    bio: 'Runs a department.',
  });
  const employee1 = await User.create({
    name: 'Employee One',
    email: 'employee1@demo.com',
    password: 'employee123',
    role: 'employee',
    bio: 'Asset user.',
  });
  const employee2 = await User.create({
    name: 'Employee Two',
    email: 'employee2@demo.com',
    password: 'employee123',
    role: 'employee',
    bio: 'Asset user.',
  });
  console.log('✓ 5 users (admin, asset_manager, dept_head, 2 employees)');

  // --- Departments ---
  const hq = await Department.create({
    name: 'HQ',
    head: admin._id,
    status: 'active',
  });
  const engineering = await Department.create({
    name: 'Engineering',
    head: head._id,
    parentDepartment: hq._id,
    status: 'active',
  });
  console.log('✓ 2 departments (HQ, Engineering)');

  // --- Asset Categories ---
  const electronicsCategory = await AssetCategory.create({
    name: 'Electronics',
    customFields: [{ label: 'Warranty (months)', type: 'number' }],
    status: 'active',
  });
  const furnitureCategory = await AssetCategory.create({
    name: 'Furniture',
    customFields: [],
    status: 'active',
  });
  console.log('✓ 2 asset categories');

  // --- Assign departments to employees ---
  head.department = engineering._id;
  await head.save();
  employee1.department = hq._id;
  await employee1.save();
  employee2.department = hq._id;
  await employee2.save();
  console.log('✓ Departments assigned to employees');

  // --- Assets (Module 3) with varied statuses and locations ---
  await Counter.create({ _id: 'assetTag', seq: 11 });

  const assets = await Asset.create([
    {
      name: 'Dell Latitude 5420',
      category: electronicsCategory._id,
      assetTag: 'AF-0012',
      serialNumber: 'DL5420-12345',
      acquisitionDate: new Date('2023-06-15'),
      acquisitionCost: 85000,
      condition: 'Good',
      location: 'Bengaluru Office',
      department: engineering._id,
      status: 'Allocated',
      currentHolder: employee1._id,
      customFieldValues: { 'Warranty (months)': 24 },
      isBookable: false,
    },
    {
      name: 'BenQ Projector MW535',
      category: electronicsCategory._id,
      assetTag: 'AF-0062',
      serialNumber: 'BQ-MW535-8877',
      acquisitionDate: new Date('2022-11-20'),
      acquisitionCost: 45000,
      condition: 'Needs repair',
      location: 'HQ Floor 2 - Conf Room A',
      department: hq._id,
      status: 'Under Maintenance',
      customFieldValues: { 'Warranty (months)': 12 },
      isBookable: true,
    },
    {
      name: 'Herman Miller Aeron Chair',
      category: furnitureCategory._id,
      assetTag: 'AF-0201',
      serialNumber: 'HM-AER-2023-45',
      acquisitionDate: new Date('2023-01-10'),
      acquisitionCost: 95000,
      condition: 'Excellent',
      location: 'Warehouse - Shelf B3',
      department: null,
      status: 'Available',
      customFieldValues: {},
      isBookable: false,
    },
    {
      name: 'HP LaserJet Pro M404dn',
      category: electronicsCategory._id,
      assetTag: 'AF-0089',
      serialNumber: 'HP-M404-6789',
      acquisitionDate: new Date('2023-03-22'),
      acquisitionCost: 28000,
      condition: 'Good',
      location: 'HQ Floor 1 - Admin',
      department: hq._id,
      status: 'Available',
      customFieldValues: { 'Warranty (months)': 36 },
      isBookable: true,
    },
    {
      name: 'Standing Desk Adjustable',
      category: furnitureCategory._id,
      assetTag: 'AF-0154',
      serialNumber: 'SD-ADJ-2024-12',
      acquisitionDate: new Date('2024-02-01'),
      acquisitionCost: 32000,
      condition: 'Excellent',
      location: 'Bengaluru Office - Desk 15',
      department: engineering._id,
      status: 'Allocated',
      currentHolder: employee2._id,
      customFieldValues: {},
      isBookable: false,
    },
    {
      name: 'MacBook Pro 16" M3',
      category: electronicsCategory._id,
      assetTag: 'AF-0320',
      serialNumber: 'MBP16-M3-9988',
      acquisitionDate: new Date('2024-05-10'),
      acquisitionCost: 250000,
      condition: 'New',
      location: 'HQ Floor 3 - IT Storage',
      department: null,
      status: 'Reserved',
      customFieldValues: { 'Warranty (months)': 12 },
      isBookable: false,
    },
  ]);
  console.log('✓ 6 assets');

  await Counter.updateOne({ _id: 'assetTag' }, { $set: { seq: 320 } });
  console.log('✓ Counter set past highest tag (AF-0320)');

  // --- Allocations (Module 4) ---
  const dell = assets.find((a) => a.assetTag === 'AF-0012'); // held by employee1
  const desk = assets.find((a) => a.assetTag === 'AF-0154'); // held by employee2
  const chair = assets.find((a) => a.assetTag === 'AF-0201'); // Available

  const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

  // 1) OVERDUE active allocation
  await Allocation.create({
    asset: dell._id,
    holder: employee1._id,
    holderDept: engineering._id,
    allocatedBy: manager._id,
    allocatedDate: daysFromNow(-30),
    expectedReturnDate: daysFromNow(-7), // past -> overdue
    status: 'active',
  });
  dell.allocationHistory = [
    {
      action: 'allocated',
      date: daysFromNow(-30),
      holder: employee1._id,
      holderName: employee1.name,
      dept: engineering._id,
      deptName: engineering.name,
      by: manager._id,
      byName: manager.name,
    },
  ];
  await dell.save();

  // 2) Active allocation (not overdue)
  await Allocation.create({
    asset: desk._id,
    holder: employee2._id,
    holderDept: engineering._id,
    allocatedBy: manager._id,
    allocatedDate: daysFromNow(-5),
    expectedReturnDate: daysFromNow(20),
    status: 'active',
  });
  desk.allocationHistory = [
    {
      action: 'allocated',
      date: daysFromNow(-5),
      holder: employee2._id,
      holderName: employee2.name,
      dept: engineering._id,
      deptName: engineering.name,
      by: manager._id,
      byName: manager.name,
    },
  ];
  await desk.save();

  // 3) A prior RETURNED allocation
  await Allocation.create({
    asset: chair._id,
    holder: employee2._id,
    holderDept: engineering._id,
    allocatedBy: manager._id,
    allocatedDate: daysFromNow(-60),
    returnedDate: daysFromNow(-40),
    checkInCondition: 'good',
    checkInNotes: 'Returned in working order.',
    status: 'returned',
  });
  chair.allocationHistory = [
    {
      action: 'allocated',
      date: daysFromNow(-60),
      holder: employee2._id,
      holderName: employee2.name,
      dept: engineering._id,
      deptName: engineering.name,
      by: manager._id,
      byName: manager.name,
    },
    {
      action: 'returned',
      date: daysFromNow(-40),
      holder: employee2._id,
      holderName: employee2.name,
      condition: 'good',
      notes: 'Returned in working order.',
      by: manager._id,
      byName: manager.name,
    },
  ];
  await chair.save();
  console.log('✓ 3 allocations (1 overdue active, 1 active, 1 prior returned)');

  // --- Maintenance requests (Module 5) ---
  const projector = assets.find((a) => a.assetTag === 'AF-0062');
  const printer = assets.find((a) => a.assetTag === 'AF-0089');
  const macbook = assets.find((a) => a.assetTag === 'AF-0320');

  await MaintenanceRequest.create([
    {
      asset: projector._id,
      raisedBy: employee2._id,
      issue: 'Projector bulb not turning on',
      priority: 'high',
      status: 'Pending',
    },
    {
      asset: projector._id,
      raisedBy: employee1._id,
      issue: 'AC unit leaking in conf room',
      priority: 'medium',
      status: 'Approved',
      approvedBy: manager._id,
    },
    {
      asset: printer._id,
      raisedBy: employee1._id,
      issue: 'Forklift hydraulics service',
      priority: 'high',
      status: 'Technician Assigned',
      technicianName: 'R Varma',
      approvedBy: manager._id,
    },
    {
      asset: printer._id,
      raisedBy: employee2._id,
      issue: 'Printer jams on duplex — parts ordered',
      priority: 'medium',
      status: 'In Progress',
      technicianName: 'S Iyer',
      approvedBy: manager._id,
    },
    {
      asset: macbook._id,
      raisedBy: employee2._id,
      issue: 'Office chair wheel repair',
      priority: 'low',
      status: 'Resolved',
      technicianName: 'R Varma',
      approvedBy: manager._id,
      resolvedAt: daysFromNow(-2),
    },
  ]);
  console.log('✓ 5 maintenance requests');

  console.log('\n=== SEED COMPLETE ===');
  console.log('Admin         : admin@demo.com   / admin1234');
  console.log('Asset manager : manager@demo.com / manager1234');
  console.log('Dept head     : head@demo.com    / head1234');
  console.log('Employee 1    : employee1@demo.com / employee123');
  console.log('Employee 2    : employee2@demo.com / employee123');

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('✗ Seed failed:', err);
  process.exit(1);
});
