import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  // ── existing fields (kept as-is) ──────────────────────────────────
  name: {
    type: String,
    required: true,
    trim: true
  },
  identification_num: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },

  // ── role: expanded from ['student','dean'] ────────────────────────
  role: {
    type: String,
    enum: ['student', 'college_admin', 'super_admin'],
    // 'dean' → renamed to 'college_admin' for multi-college clarity
    default: 'student',
    required: true
  },

  // ── multi-college: which college this user belongs to ────────────
  // null only for super_admin (they sit above all colleges)
  college: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    default: null,
    required: function () {
      return this.role !== 'super_admin';
    }
  },

  // ── auth: refresh token stored server-side for rotation ──────────
  refreshToken: {
    type: String,
    default: null
  },

  // ── email verification ────────────────────────────────────────────
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String,
    default: null
  },
  verificationTokenExpiry: {
    type: Date,
    default: null
  },

  // ── password reset ────────────────────────────────────────────────
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpiry: {
    type: Date,
    default: null
  },

  // ── account status ────────────────────────────────────────────────
  isActive: {
    type: Boolean,
    default: true
  }

}, {
  timestamps: true   // ✅ CORRECT PLACE (second argument)
});

  // ── existing timestamp (kept, and added updatedAt) ────────────────
  // createdAt: {
  //   type: Date,
  //   default: Date.now   // changed from null → auto-set on creation
  // },
  // updatedAt: {
  //   type: Date,
  //   default: null
  // }


// ── auto-update updatedAt on every save ───────────────────────────────
userSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// ── never expose sensitive fields in API responses ────────────────────
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.verificationToken;
  delete obj.verificationTokenExpiry;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpiry;
  return obj;
};

// ── helper: is this user scoped to a specific college? ────────────────
userSchema.methods.isCollegeScoped = function () {
  return this.role !== 'super_admin';
};

const User = mongoose.model('User', userSchema);
export default User;