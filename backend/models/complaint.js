import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  // ── existing fields (kept as-is) ──────────────────────────────────
  complaint_category: {
    type: String,
    required: true,
    trim: true
  },
  section: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  complaint_details: {
    type: String,
    required: true,
    trim: true
  },

  // ── status: expanded from ['Active','Resolved'] ───────────────────
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'resolved', 'rejected'],
    default: 'pending'
    // 'Active'   → split into 'pending' and 'in_progress'
    // 'Resolved' → renamed to 'resolved', added 'rejected'
  },

  // ── full audit trail of every status change ───────────────────────
  statusHistory: [
    {
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'resolved', 'rejected']
      },
      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      note: {
        type: String,
        default: ''   // admin can leave a comment on each status change
      },
      changedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  // ── existing fields (kept) ─────────────────────────────────────────
  upvotes: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  resolvement: {
    type: String,
    default: ''
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // ── multi-college: scope this complaint to one college ────────────
  college: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'College',
    required: true
    // auto-set from req.user.college when student submits
  },

  // ── photo attachments (compressed before saving) ──────────────────
  photos: [
    {
      url: {
        type: String,
        required: true        // local path or cloud URL (Cloudinary etc.)
      },
      filename: {
        type: String          // saved filename on disk
      },
      originalName: {
        type: String          // original filename from user's device
      },
      sizeKB: {
        type: Number          // size AFTER compression, for your records
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  // ── priority: helps admin triage ──────────────────────────────────
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },

  // ── existing complainee (kept, just renamed ref for clarity) ──────
  complainee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // ── assigned admin (college_admin handling this complaint) ────────
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // ── existing timestamps ────────────────────────────────────────────
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: null
  }
});

// ── auto-update updatedAt on every save ───────────────────────────────
complaintSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// ── auto-push to statusHistory whenever status changes ────────────────
complaintSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    this.statusHistory.push({
      status: this.status,
      changedBy: this._changedBy || null,   // set req.user._id before saving
      note: this._statusNote || '',          // set optional note before saving
    });

    // auto-set resolvedAt when marked resolved
    if (this.status === 'resolved') {
      this.resolvedAt = new Date();
    }
  }
  next();
});

const Complaint = mongoose.model('Complaint', complaintSchema);
export default Complaint;