const bcrypt = require('bcryptjs');
const User = require('../models/User');

const initBmcUser = async () => {
  try {
    const existingBmc = await User.findOne({ username: 'bmc' });
    if (!existingBmc) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);

      await User.create({
        name: 'BMC Mumbai',
        username: 'bmc',
        email: 'bmc@mumbai.gov.in',
        password: hashedPassword,
        role: 'user',
        avatar: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?w=200&h=200&fit=crop',
        bio: 'BMC Mumbai official account.'
      });
      console.log('👤 Initialized @bmc account as regular user (Password: password123)');
    } else {
      // Keep BMC as standard user
      existingBmc.role = 'user';
      existingBmc.name = 'BMC Mumbai';
      await existingBmc.save();
    }
  } catch (err) {
    console.error('Error initializing BMC user:', err.message);
  }
};

module.exports = initBmcUser;
