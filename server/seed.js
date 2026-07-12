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
import { Booking } from './src/models/Booking.js';
import { AuditCycle } from './src/models/AuditCycle.js';
import { ActivityLog } from './src/models/ActivityLog.js';
import { Notification } from './src/models/Notification.js';

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
    Booking.deleteMany({}),
    AuditCycle.deleteMany({}),
    ActivityLog.deleteMany({}),
    Notification.deleteMany({}),
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

  // --- Assets with varied statuses and locations ---
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
    {
      name: 'Conference Room B2',
      category: furnitureCategory._id,
      assetTag: 'AF-0410',
      serialNumber: 'ROOM-B2',
      acquisitionDate: new Date('2020-01-01'),
      acquisitionCost: 0,
      condition: 'Good',
      location: 'HQ Floor 2',
      department: hq._id,
      status: 'Available',
      customFieldValues: {},
      isBookable: true, // a bookable resource
    },
    {
      name: 'Toyota Innova (Fleet)',
      category: furnitureCategory._id,
      assetTag: 'AF-0450',
      serialNumber: 'KA01-INV-9',
      acquisitionDate: new Date('2019-08-01'), // old → nearing retirement in reports
      acquisitionCost: 1800000,
      condition: 'Good',
      location: 'Basement Parking',
      department: hq._id,
      status: 'Available',
      customFieldValues: {},
      isBookable: true,
    },
    {
      name: 'Old Desktop Tower',
      category: electronicsCategory._id,
      assetTag: 'AF-0470',
      serialNumber: 'DT-OLD-2016',
      acquisitionDate: new Date('2016-04-01'),
      acquisitionCost: 40000,
      condition: 'Worn',
      location: 'Store Room',
      department: hq._id,
      status: 'Retired', // terminal status — demoes the Retired pill + non-allocatable rule
      customFieldValues: {},
      isBookable: false,
    },
    {
      name: 'Cracked Monitor',
      category: electronicsCategory._id,
      assetTag: 'AF-0480',
      serialNumber: 'MON-CRK-01',
      acquisitionDate: new Date('2017-09-01'),
      acquisitionCost: 12000,
      condition: 'Damaged',
      location: 'E-waste',
      department: null,
      status: 'Disposed', // terminal status
      customFieldValues: {},
      isBookable: false,
    },
  ]);
  console.log('✓ 10 assets (2 bookable; Reserved/Retired/Disposed present)');

  await Counter.updateOne({ _id: 'assetTag' }, { $set: { seq: 480 } });
  console.log('✓ Counter set past highest tag (AF-0480)');

  // --- Allocations ---
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

  // Allocate a printer to the admin so their own dashboard shows self-assigned assets.
  const printerAsset = assets.find((a) => a.assetTag === 'AF-0089');
  await Allocation.create({
    asset: printerAsset._id,
    holder: admin._id,
    holderDept: hq._id,
    allocatedBy: admin._id,
    allocatedDate: daysFromNow(-3),
    expectedReturnDate: daysFromNow(10),
    status: 'active',
  });
  printerAsset.status = 'Allocated';
  printerAsset.currentHolder = admin._id;
  printerAsset.allocationHistory = [{
    action: 'allocated', date: daysFromNow(-3), holder: admin._id, holderName: admin.name,
    dept: hq._id, deptName: hq.name, by: admin._id, byName: admin.name,
  }];
  await printerAsset.save();
  console.log('✓ 4 allocations (1 overdue, 1 active, 1 returned, 1 to admin)');

  // A pending transfer so the "Request History" section + pending-approvals are demoable.
  await Transfer.create({
    asset: dell._id, // AF-0012, held by employee1
    fromHolder: employee1._id,
    toRequester: employee2._id,
    reason: 'Employee Two needs the laptop for a project',
    status: 'Requested',
  });
  console.log('✓ 1 pending transfer request (employee1 → employee2 on AF-0012)');

  // --- Maintenance requests ---
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
      photo: '/uploads/sample-maintenance.png', // demoes the "View photo" button
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

  // --- Bookings ---
  const room = assets.find((a) => a.assetTag === 'AF-0410'); // Conference Room B2
  // Two non-overlapping slots today so the day rail has blocks; a demo user can
  // then try 9:30–10:30 to hit the overlap 409.
  const at = (h, m = 0) => {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };
  const vehicle = assets.find((a) => a.assetTag === 'AF-0450'); // bookable fleet vehicle
  // A slot on day D at hour H (D relative to today) so the heatmap spreads across days.
  const slot = (dayOffset, hour) => {
    const s = new Date();
    s.setDate(s.getDate() + dayOffset);
    s.setHours(hour, 0, 0, 0);
    const e = new Date(s);
    e.setHours(hour + 1);
    return { start: s, end: e };
  };
  const bookingDefs = [
    { r: room, by: employee1, purpose: 'Procurement Team', start: at(9, 0), end: at(10, 0) },
    { r: room, by: employee2, purpose: 'Design Review', start: at(14, 0), end: at(15, 0) },
    // Spread across weekdays/hours so the booking heatmap renders non-empty.
    ...[[-2, 10], [-1, 11], [1, 9], [2, 15], [3, 16], [4, 13]].map(([d, h], i) => {
      const { start, end } = slot(d, h);
      return { r: vehicle, by: i % 2 ? employee1 : employee2, purpose: 'Site visit', start, end };
    }),
  ];
  await Booking.create(
    bookingDefs.map((b) => ({
      resource: b.r._id,
      bookedBy: b.by._id,
      purpose: b.purpose,
      startTime: b.start,
      endTime: b.end,
      status: 'Upcoming',
    }))
  );
  console.log(`✓ ${bookingDefs.length} bookings (room + fleet, spread for the heatmap)`);

  // --- Audit cycle: Open, scoped to Engineering, items Pending ---
  const engAssets = assets.filter((a) => String(a.department) === String(engineering._id));
  await AuditCycle.create({
    title: 'Q3 Audit — Engineering',
    scopeType: 'department',
    department: engineering._id,
    startDate: daysFromNow(-2),
    endDate: daysFromNow(13),
    auditors: [manager._id, head._id],
    status: 'Open',
    items: engAssets.map((a) => ({
      asset: a._id,
      expectedLocation: a.location || '',
      mark: 'Pending',
      note: '',
    })),
  });
  console.log(`✓ 1 open audit cycle (${engAssets.length} items to verify)`);

  // A CLOSED audit cycle that already flagged a Missing asset → the discrepancy
  // report on Reports is non-empty, and the asset reflects Lost.
  const missingAsset = assets.find((a) => a.assetTag === 'AF-0201'); // the chair
  missingAsset.status = 'Lost';
  missingAsset.currentHolder = null;
  await missingAsset.save();
  await AuditCycle.create({
    title: 'Q2 Audit — HQ (closed)',
    scopeType: 'department',
    department: hq._id,
    startDate: daysFromNow(-40),
    endDate: daysFromNow(-25),
    auditors: [manager._id],
    status: 'Closed',
    items: [
      { asset: missingAsset._id, expectedLocation: 'Warehouse - Shelf B3', mark: 'Missing', note: 'Not found during audit' },
      { asset: assets.find((a) => a.assetTag === 'AF-0089')._id, expectedLocation: 'HQ Floor 1 - Admin', mark: 'Verified', note: '' },
    ],
  });
  console.log('✓ 1 closed audit cycle (AF-0201 flagged Missing → Lost)');

  // --- Activity Logs ---
  // Seed recent activity matching the mockups
  await ActivityLog.create([
    {
      actor: manager._id,
      action: 'asset.allocated',
      summary: `${dell.name} ${dell.assetTag} allocated to ${employee1.name} — ${engineering.name}`,
      entityType: 'Allocation',
      entityId: dell._id,
      createdAt: daysFromNow(-30),
    },
    {
      actor: manager._id,
      action: 'asset.allocated',
      summary: `${desk.name} ${desk.assetTag} allocated to ${employee2.name} — ${engineering.name}`,
      entityType: 'Allocation',
      entityId: desk._id,
      createdAt: daysFromNow(-5),
    },
    {
      actor: manager._id,
      action: 'maintenance.approved',
      summary: `Maintenance request ${projector.assetTag} approved — Projector bulb replacement`,
      entityType: 'MaintenanceRequest',
      entityId: projector._id,
      createdAt: daysFromNow(-3),
    },
    {
      actor: manager._id,
      action: 'asset.returned',
      summary: `${chair.name} ${chair.assetTag} returned by ${employee2.name} — condition: good`,
      entityType: 'Allocation',
      entityId: chair._id,
      createdAt: daysFromNow(-40),
    },
    {
      actor: employee1._id,
      action: 'maintenance.raised',
      summary: `Maintenance request raised for ${printer.assetTag} — Printer jam issue`,
      entityType: 'MaintenanceRequest',
      entityId: printer._id,
      createdAt: daysFromNow(-2),
    },
    {
      actor: manager._id,
      action: 'maintenance.resolved',
      summary: `Maintenance request ${macbook.assetTag} resolved — Chair wheel repair completed`,
      entityType: 'MaintenanceRequest',
      entityId: macbook._id,
      createdAt: daysFromNow(-2),
    },
  ]);
  console.log('✓ 6 activity logs seeded');

  // --- Notifications with type categories ---
  // Seed varied notifications across the notification tabs
  await Notification.create([
    {
      user: employee1._id,
      type: 'info',
      message: `${dell.name} ${dell.assetTag} assigned to you`,
      link: `/assets/${dell._id}`,
      read: false,
      createdAt: daysFromNow(-30),
    },
    {
      user: employee2._id,
      type: 'info',
      message: `${desk.name} ${desk.assetTag} assigned to you`,
      link: `/assets/${desk._id}`,
      read: false,
      createdAt: daysFromNow(-5),
    },
    {
      user: employee2._id,
      type: 'approval',
      message: `Maintenance request ${projector.assetTag} approved — Projector repair`,
      link: '/maintenance',
      read: false,
      createdAt: daysFromNow(-3),
    },
    {
      user: employee1._id,
      type: 'alert',
      message: `Overdue return: ${dell.assetTag} was due ${Math.floor((Date.now() - new Date(daysFromNow(-7))) / (1000 * 60 * 60 * 24))} days ago`,
      link: '/allocation',
      read: false,
      createdAt: daysFromNow(-1),
    },
    {
      user: employee2._id,
      type: 'approval',
      message: `Transfer request approved: ${chair.assetTag} moved to Facilities dept`,
      link: '/allocation',
      read: true,
      createdAt: daysFromNow(-40),
    },
    {
      user: employee1._id,
      type: 'booking',
      message: `Booking confirmed: Conference Room B2 — 2:00 PM to 3:00 PM`,
      link: '/booking',
      read: false,
      createdAt: daysFromNow(-1),
    },
    {
      user: employee2._id,
      type: 'alert',
      message: `Audit discrepancy flagged: ${macbook.assetTag} condition mismatch`,
      link: '/audit',
      read: false,
      createdAt: daysFromNow(-4),
    },
  ]);
  console.log('✓ 7 typed notifications seeded');

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
