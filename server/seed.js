import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import { User } from './src/models/User.js';
import { Item } from './src/models/Item.js';
import { Comment } from './src/models/Comment.js';
import { Request } from './src/models/Request.js';
import { Notification } from './src/models/Notification.js';

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
  ]);

  // --- Users (password hashing happens in the User pre-save hook) ---
  const admin = await User.create({
    name: 'Admin',
    email: 'admin@demo.com',
    password: 'admin1234',
    role: 'admin',
    bio: 'Platform administrator.',
  });
  const demo = await User.create({
    name: 'Demo User',
    email: 'demo@demo.com',
    password: 'demo1234',
    bio: 'Just here to test the template.',
  });
  const priya = await User.create({
    name: 'Priya Sharma',
    email: 'priya@demo.com',
    password: 'priya1234',
    bio: 'Builds things at hackathons.',
  });
  console.log('✓ users: admin@demo.com / demo@demo.com / priya@demo.com');

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
  console.log('Admin : admin@demo.com / admin1234');
  console.log('User  : demo@demo.com  / demo1234');
  console.log('User  : priya@demo.com / priya1234');

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('✗ Seed failed:', err);
  process.exit(1);
});
