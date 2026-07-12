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
  await AssetCategory.create([
    {
      name: 'Electronics',
      customFields: [{ label: 'Warranty (months)', type: 'number' }],
      status: 'active',
    },
    {
      name: 'Furniture',
      customFields: [],
      status: 'active',
    },
    {
      name: 'Vehicles',
      customFields: [{ label: 'License Plate', type: 'text' }],
      status: 'inactive',
    },
  ]);
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
