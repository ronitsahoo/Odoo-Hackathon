import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import { User } from './src/models/User.js';
import { Item } from './src/models/Item.js';
import { Comment } from './src/models/Comment.js';
import { Request } from './src/models/Request.js';
import { Notification } from './src/models/Notification.js';
import { Department } from './src/models/Department.js';
import { AssetCategory } from './src/models/AssetCategory.js';
import { Asset } from './src/models/Asset.js';
import { Counter } from './src/models/Counter.js';

/**
 * Wipe and reseed the database with a demo dataset that exercises every feature:
 * an admin, two users, approved + pending items, a comment, a pending request,
 * and a notification. Run with: npm run seed
 */
async function seed() {
  await connectDB();
  console.log('… clearing existing data');
  await Promise.all([
    User.deleteMany({}),
    Item.deleteMany({}),
    Comment.deleteMany({}),
    Request.deleteMany({}),
    Notification.deleteMany({}),
    Department.deleteMany({}),
    AssetCategory.deleteMany({}),
    Asset.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  // --- Users (password hashing happens in the User pre-save hook) ---
  // One of every role + a deactivated employee, so RBAC and the status gate
  // both have something to demonstrate. Department stays null until Module 2.
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
  const demo = await User.create({
    name: 'Demo User',
    email: 'demo@demo.com',
    password: 'demo1234',
    role: 'employee',
    bio: 'Just here to test the template.',
  });
  const priya = await User.create({
    name: 'Priya Sharma',
    email: 'priya@demo.com',
    password: 'priya1234',
    role: 'employee',
    bio: 'Builds things at hackathons.',
  });
  await User.create({
    name: 'Sam Inactive',
    email: 'inactive@demo.com',
    password: 'inactive1234',
    role: 'employee',
    status: 'inactive', // cannot log in until an admin reactivates
    bio: 'Deactivated account for testing the status gate.',
  });
  console.log('✓ 6 users (admin, asset_manager, dept_head, 3 employees; 1 inactive)');

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
  await Department.create({
    name: 'Marketing',
    status: 'inactive',
  });
  console.log('✓ 3 departments (HQ, Engineering with parent, Marketing inactive)');

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
  await AssetCategory.create({
    name: 'Vehicles',
    customFields: [{ label: 'License Plate', type: 'text' }],
    status: 'inactive',
  });
  console.log('✓ 3 asset categories (Electronics with custom field, Furniture, Vehicles inactive)');

  // --- Assign departments to employees ---
  head.department = engineering._id;
  await head.save();
  demo.department = hq._id;
  await demo.save();
  priya.department = hq._id;
  await priya.save();
  console.log('✓ Departments assigned to employees');

  // --- Items (mix of statuses so moderation queue + Home both have content) ---
  const items = await Item.create([
    {
      title: 'How do I paginate a MongoDB text search?',
      description:
        '<p>I have a text index and want <strong>page + limit</strong> pagination. What is the cleanest Mongoose approach?</p>',
      category: 'Question',
      tags: ['mongodb', 'mongoose', 'search'],
      owner: demo._id,
      status: 'approved',
    },
    {
      title: 'Vintage denim jacket — size M',
      description: '<p>Barely worn denim jacket. Looking to swap for a hoodie.</p>',
      category: 'Clothing',
      tags: ['denim', 'jacket', 'swap'],
      owner: priya._id,
      status: 'approved',
    },
    {
      title: 'Login button unresponsive on Safari',
      description: '<p>The login button does nothing on Safari 17. Console shows no errors.</p>',
      category: 'Bug',
      tags: ['safari', 'auth'],
      owner: demo._id,
      status: 'pending', // shows up in the admin moderation queue
    },
    {
      title: 'Tennis court — Saturday 4pm slot',
      description: '<p>Court #3 available Saturday afternoon. Book a slot.</p>',
      category: 'Booking',
      tags: ['tennis', 'court'],
      owner: priya._id,
      status: 'approved',
      location: { lat: 28.6139, lng: 77.209 },
    },
  ]);
  console.log(`✓ ${items.length} items (3 approved, 1 pending)`);

  // Give the first item a couple of votes.
  items[0].upvotes = [priya._id, admin._id];
  await items[0].save();

  // --- A comment / answer on the first question ---
  await Comment.create({
    item: items[0]._id,
    author: priya._id,
    body: '<p>Use <code>.skip((page-1)*limit).limit(limit)</code> with a <code>$text</code> filter and count in parallel.</p>',
    upvotes: [demo._id],
    isAccepted: true,
  });
  console.log('✓ 1 accepted answer');

  // --- A pending request from demo -> priya on the denim jacket ---
  const request = await Request.create({
    item: items[1]._id,
    fromUser: demo._id,
    toUser: priya._id,
    message: 'Would you swap the jacket for a grey hoodie (size M)?',
    status: 'pending',
  });

  // --- A notification for priya about that request ---
  await Notification.create({
    user: priya._id,
    type: 'request',
    message: 'Demo User sent a request on "Vintage denim jacket — size M"',
    link: '/dashboard',
  });
  console.log('✓ 1 request + 1 notification');

  // --- Assets (Module 3) with varied statuses and locations ---
  // Seed the counter first so tags start at AF-0012
  await Counter.create({ _id: 'assetTag', seq: 11 });

  await Asset.create([
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
      currentHolder: demo._id,
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
      currentHolder: priya._id,
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
  console.log('✓ 6 assets (varied statuses: Allocated, Under Maintenance, Available, Reserved)');

  // Update counter to reflect the highest seeded tag
  await Counter.updateOne({ _id: 'assetTag' }, { $set: { seq: 320 } });
  console.log('✓ Counter set past highest tag (AF-0320)');
  console.log('✓ 1 request + 1 notification');

  console.log('\n=== SEED COMPLETE ===');
  console.log('Admin         : admin@demo.com   / admin1234');
  console.log('Asset manager : manager@demo.com / manager1234');
  console.log('Dept head     : head@demo.com    / head1234');
  console.log('Employee      : demo@demo.com    / demo1234');
  console.log('Employee      : priya@demo.com   / priya1234');
  console.log('Employee (inactive, cannot log in): inactive@demo.com / inactive1234');

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('✗ Seed failed:', err);
  process.exit(1);
});
