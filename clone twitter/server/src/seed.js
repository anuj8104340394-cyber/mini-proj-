const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const Post = require('./models/Post');
const Comment = require('./models/Comment');

const seedData = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/twitter_app';
    await mongoose.connect(mongoUri);
    console.log(` Connected to MongoDB: ${mongoUri}`);

    // Clear existing collections
    await User.deleteMany({});
    await Post.deleteMany({});
    await Comment.deleteMany({});
    console.log(' Cleared existing users, posts, and comments.');

    // Common password for all demo users
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    // 1. Create 5 dummy users
    const usersData = [
      {
        name: 'Alex Rivera',
        username: 'alexrivera',
        email: 'alex@example.com',
        password: passwordHash,
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
        bio: 'Tech enthusiast, open source contributor, and community admin. Coffee drinker.'
      },
      {
        name: 'Sarah Chen',
        username: 'sarahc',
        email: 'sarah@example.com',
        password: passwordHash,
        role: 'user',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces',
        bio: 'Frontend engineer specializing in React & design systems. Exploring Web UI patterns.'
      },
      {
        name: 'Marcus Johnson',
        username: 'marcusj',
        email: 'marcus@example.com',
        password: passwordHash,
        role: 'user',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
        bio: 'Full-stack developer building fast web applications. Node.js & cloud architecture.'
      },
      {
        name: 'Emily Davis',
        username: 'emilyd',
        email: 'emily@example.com',
        password: passwordHash,
        role: 'user',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=faces',
        bio: 'Product designer and accessibility advocate. Clean aesthetics & great UX.'
      },
      {
        name: 'Rohan Mehta',
        username: 'rohanm',
        email: 'rohan@example.com',
        password: passwordHash,
        role: 'user',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
        bio: 'Civil engineer & urban planning enthusiast. Keeping our neighborhoods thriving.'
      }
    ];

    const createdUsers = await User.insertMany(usersData);
    console.log(` Created ${createdUsers.length} dummy users.`);

    const [alex, sarah, marcus, emily, rohan] = createdUsers;

    // 2. Create 20 dummy posts
    const postsData = [
      {
        author: alex._id,
        text: 'Just deployed our brand new Twitter-like MVP web application built with React and Node.js! Clean, fast, and responsive.',
        location: 'San Francisco, CA',
        likes: [sarah._id, marcus._id, emily._id]
      },
      {
        author: sarah._id,
        text: 'Tailwind CSS v4 with Vite makes prototyping user interfaces absurdly fast. Who else is using it in their daily workflow?',
        location: 'Seattle, WA',
        likes: [alex._id, emily._id]
      },
      {
        author: marcus._id,
        text: 'Pothole on Main Street was finally filled today after reporting it through our local community board! Small wins for the city.',
        location: 'Downtown Ward 4',
        likes: [rohan._id, alex._id]
      },
      {
        author: emily._id,
        text: 'Good design is as little design as possible. Stripping away clutter always reveals what truly matters to the user.',
        location: 'Austin, TX',
        likes: [sarah._id, alex._id, marcus._id, rohan._id]
      },
      {
        author: rohan._id,
        text: 'Morning walk through the neighborhood park. Clean streets and fresh air make the best start to any productive day!',
        location: 'Greenwood Park',
        likes: [alex._id]
      },
      {
        author: alex._id,
        text: 'Reminder to all developers: write clean code, keep your dependencies updated, and remember to commit early and often.',
        location: 'Developer Hub',
        likes: [sarah._id, marcus._id]
      },
      {
        author: sarah._id,
        text: 'Working on a new threaded comments component today with clean recursive hierarchy. Loving React 19 hooks!',
        location: 'Remote',
        likes: [emily._id, marcus._id]
      },
      {
        author: marcus._id,
        text: 'MongoDB aggregation pipelines are remarkably versatile when calculating like counts and author references efficiently.',
        location: 'Tech District',
        likes: [alex._id, sarah._id]
      },
      {
        author: emily._id,
        text: 'Color palette exploration: Deep obsidian black with subtle slate borders and electric cyan accents. Very sleek.',
        location: 'Design Studio',
        likes: [sarah._id, rohan._id]
      },
      {
        author: rohan._id,
        text: 'Solar panels installed on the municipal library rooftop today. Excited to see our ward adopting renewable energy.',
        location: 'Ward 12',
        likes: [alex._id, emily._id, marcus._id]
      },
      {
        author: alex._id,
        text: 'What is your favorite frontend framework in 2026? React continues to maintain incredible momentum.',
        location: 'Global',
        likes: [sarah._id, emily._id]
      },
      {
        author: sarah._id,
        text: 'A clean Navbar with instant responsiveness makes mobile browsing an absolute joy. Always prioritize accessibility!',
        location: 'Seattle, WA',
        likes: [alex._id]
      },
      {
        author: marcus._id,
        text: 'Database indexing is the single highest ROI optimization you can do for high-traffic social feeds.',
        location: 'Backend Station',
        likes: [alex._id, rohan._id]
      },
      {
        author: emily._id,
        text: 'Simplicity is about subtracting the obvious and adding the meaningful.',
        location: 'Austin, TX',
        likes: [sarah._id, alex._id]
      },
      {
        author: rohan._id,
        text: 'Streetlights along 5th Avenue were inspected and upgraded to energy-efficient LED fixtures today.',
        location: 'Ward 5',
        likes: [marcus._id, alex._id]
      },
      {
        author: alex._id,
        text: 'Testing out the image upload workflow with Multer disk storage. Fast, predictable, and local.',
        location: 'Localhost',
        likes: [sarah._id]
      },
      {
        author: sarah._id,
        text: 'Great documentation saves hundreds of hours of debugging down the line. Treat docs as first-class code.',
        location: 'Tech Corner',
        likes: [alex._id, marcus._id, emily._id]
      },
      {
        author: marcus._id,
        text: 'Always test your JWT expiration logic! Secure authentication is foundational for any user platform.',
        location: 'Security Labs',
        likes: [alex._id]
      },
      {
        author: emily._id,
        text: 'Typography choice: crisp system font stack with subtle tracking. Readability score 10/10.',
        location: 'Design Lab',
        likes: [sarah._id]
      },
      {
        author: rohan._id,
        text: 'Neighborhood community meetup scheduled for Saturday at 10 AM. Let us discuss upcoming green initiatives!',
        location: 'Community Center',
        likes: [alex._id, sarah._id, marcus._id, emily._id]
      }
    ];

    const createdPosts = await Post.insertMany(postsData);
    console.log(` Created ${createdPosts.length} dummy posts.`);

    // 3. Create comments and nested replies
    const post0 = createdPosts[0];
    const post1 = createdPosts[1];
    const post2 = createdPosts[2];

    // Comment 1 on post 0
    const comment1 = await Comment.create({
      post: post0._id,
      author: sarah._id,
      text: 'Congratulations on the launch! The UI is looking super clean and responsive.',
      parentComment: null
    });

    // Reply to comment 1
    await Comment.create({
      post: post0._id,
      author: alex._id,
      text: 'Thanks Sarah! Appreciate the feedback. More updates coming soon.',
      parentComment: comment1._id
    });

    // Comment 2 on post 1
    const comment2 = await Comment.create({
      post: post1._id,
      author: emily._id,
      text: 'Tailwind v4 is definitely a game-changer with zero config CSS!',
      parentComment: null
    });

    // Reply to comment 2
    await Comment.create({
      post: post1._id,
      author: sarah._id,
      text: '100% agreed! Build times are practically instantaneous.',
      parentComment: comment2._id
    });

    // Comment on post 2
    await Comment.create({
      post: post2._id,
      author: rohan._id,
      text: 'Great to see civic maintenance taking prompt action.',
      parentComment: null
    });

    console.log(' Created comments and nested threaded replies.');
    console.log(' Demo Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error(' Seeding error:', error);
    process.exit(1);
  }
};

seedData();
