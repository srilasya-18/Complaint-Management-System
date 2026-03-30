import mongoose from 'mongoose';

const collegeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },

  // e.g. "vnit.ac.in" — used to auto-assign students to a college on signup
  emailDomain: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  // short code for display, e.g. "VNIT", "IIT-B"
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },

  location: {
    type: String,
    default: null
  },

  isActive: {
    type: Boolean,
    default: true
    // super_admin can deactivate an entire college
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const College = mongoose.model('College', collegeSchema);
export default College;