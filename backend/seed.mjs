import 'dotenv/config';
import { dbConnect } from './src/config/mongoose.js';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

async function forceResetAdmin() {
  try {
    await dbConnect();

    // 🚨 FIELD NAME FIXED: passwordHash
    const UserSchema = new mongoose.Schema({
      email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
      passwordHash: { type: String, required: true }, 
      name:         { type: String, required: true },
      role:         { type: String, default: 'admin' },
    });
    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    const email         = 'admin';
    const plainPassword = 'A@123';
    const name          = 'Fotographiya Admin';

    console.log('🔄 Resetting admin account...');

    // Remove existing admin accounts (both 'admin' and old 'admin@fotographiya.com')
    await User.deleteMany({ email: { $in: ['admin', 'admin@fotographiya.com'] } });

    // Strictly hash the password
    const hash = await bcrypt.hash(plainPassword, 12);

    // Create fresh account
    await User.create({ email, name, passwordHash: hash });
    
    console.log('✅ Admin user FORCE RESET successfully!');
    console.log('   Username/Email: ', email);
    console.log('   Password:       ', plainPassword);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating admin:', err);
    process.exit(1);
  }
}

forceResetAdmin();
