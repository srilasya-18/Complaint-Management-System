// backend/graphql/resolvers/complaint.js
import Complaint from '../../models/complaint.js';;
import ComplaintUpvoter from '../../models/complaint_upvoters.js';
import {
  transformComplaint,
  transformDetailComplaint,
  transformResolvedComplaint,
  getupVoteStatus
} from '../../helpers/common.js';
import { errorNames } from '../../helpers/errorConstants.js';

export default {
  // ── student: create complaint ──────────────────────────────────────
  createComplaint: async (args, req) => {
    if (!req.isAuth) {
      throw new Error(errorNames.UNAUTHORIZED_CLIENT);
    }
    const complaint = new Complaint({
      complaint_category: args.complaintInput.complaint_category,
      section: args.complaintInput.section,
      department: args.complaintInput.department,
      complaint_details: args.complaintInput.complaint_details,
      priority: args.complaintInput.priority || 'medium',
      photos: args.complaintInput.photos || [],
      createdAt: new Date(),
      complainee: req.userId,
      college: req.userCollege,    // auto-set from JWT, student can't fake it
      status: 'pending',
      statusHistory: [{
        status: 'pending',
        changedBy: req.userId,
        note: 'Complaint submitted',
        changedAt: new Date()
      }]
    });
    try {
      const result = await complaint.save();
      return transformComplaint(result);
    } catch (err) {
      throw err;
    }
  },

  // ── student: list their own / all complaints ───────────────────────
  // existing query — now also filters by college automatically
  listComplaints: async ({ status, userId }, req) => {
    if (!req.isAuth) {
      throw new Error(errorNames.UNAUTHORIZED_CLIENT);
    }
    let conditions = {};

    // scope to college always (student sees only their college's complaints)
    if (req.userCollege) {
      conditions.college = req.userCollege;
    }
    if (status) conditions.status = status;
    if (userId) conditions.complainee = userId;

    try {
      const complaints = await Complaint.find(conditions);
      return complaints.map(c => transformComplaint(c));
    } catch (err) {
      throw err;
    }
  },

  // ── college admin: list complaints scoped to their college ─────────
listCollegeComplaints: async ({ status, priority }, req) => {
  if (!req.isAuth || req.userRole !== 'college_admin') {
    throw new Error(errorNames.UNAUTHORIZED_CLIENT);
  }

  let conditions = { college: req.userCollege };
  if (status)   conditions.status = status;
  if (priority) conditions.priority = priority;

  try {
    const complaints = await Complaint.find(conditions)
      .populate('college')
      .populate('complainee')
      .populate('resolvedBy')
      .populate('assignedTo')
      .populate('statusHistory.changedBy')
      .sort({ createdAt: -1 });

    console.log("found:", complaints.length);  // remove after confirmed working
    return complaints.map(c => transformComplaint(c));
  } catch (err) {
    throw err;
  }
},
  // ── super admin: list ALL complaints across all colleges ───────────
  listAllComplaints: async ({ status, collegeId }, req) => {
    if (!req.isAuth || req.userRole !== 'super_admin') {
      throw new Error(errorNames.UNAUTHORIZED_CLIENT);
    }
    let conditions = {};
    if (status)   conditions.status = status;
    if (collegeId) conditions.college = collegeId;

    try {
      const complaints = await Complaint.find(conditions)
        .sort({ createdAt: -1 });
      return complaints.map(c => transformComplaint(c));
    } catch (err) {
      throw err;
    }
  },

  // ── super admin: stats per college ────────────────────────────────
  getCollegeStats: async (args, req) => {
    if (!req.isAuth || req.userRole !== 'super_admin') {
      throw new Error(errorNames.UNAUTHORIZED_CLIENT);
    }
    try {
      const stats = await Complaint.aggregate([
        {
          $group: {
            _id: '$college',
            totalComplaints: { $sum: 1 },
            pendingCount:    { $sum: { $cond: [{ $eq: ['$status', 'pending'] },    1, 0] } },
            inProgressCount: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
            resolvedCount:   { $sum: { $cond: [{ $eq: ['$status', 'resolved'] },   1, 0] } },
            rejectedCount:   { $sum: { $cond: [{ $eq: ['$status', 'rejected'] },   1, 0] } },
          }
        }
      ]);

      // populate college details for each stat entry
      const College = (await import('../../models/college.js')).default;
      return await Promise.all(
        stats.map(async s => ({
          college: await College.findById(s._id),
          totalComplaints: s.totalComplaints,
          pendingCount:    s.pendingCount,
          inProgressCount: s.inProgressCount,
          resolvedCount:   s.resolvedCount,
          rejectedCount:   s.rejectedCount,
        }))
      );
    } catch (err) {
      throw err;
    }
  },

  // ── college admin: update complaint status ─────────────────────────
  updateComplaintStatus: async ({ statusInput }, req) => {
    if (!req.isAuth || req.userRole !== 'college_admin') {
      throw new Error(errorNames.UNAUTHORIZED_CLIENT);
    }
    try {
      // college admin can only touch their own college's complaints
      const complaint = await Complaint.findOne({
        _id: statusInput.complaintId,
        college: req.userCollege
      });
      if (!complaint) throw new Error(errorNames.INVALID_COMPLAINT);

      complaint.status = statusInput.status;
      complaint.statusHistory.push({
        status: statusInput.status,
        changedBy: req.userId,
        note: statusInput.note || '',
        changedAt: new Date()
      });

      // auto-set resolvedAt and resolvedBy when marking resolved
      if (statusInput.status === 'resolved') {
        complaint.resolvedAt = new Date();
        complaint.resolvedBy = req.userId;
      }

      const result = await complaint.save();
      return transformComplaint(result);
    } catch (err) {
      throw err;
    }
  },

  // ── college admin: assign complaint to an admin ────────────────────
  assignComplaint: async ({ assignInput }, req) => {
    if (!req.isAuth || req.userRole !== 'college_admin') {
      throw new Error(errorNames.UNAUTHORIZED_CLIENT);
    }
    try {
      const result = await Complaint.findOneAndUpdate(
        { _id: assignInput.complaintId, college: req.userCollege },
        {
          $set: {
            assignedTo: assignInput.adminId,
            status: 'in_progress',
          },
          $push: {
            statusHistory: {
              status: 'in_progress',
              changedBy: req.userId,
              note: 'Complaint assigned',
              changedAt: new Date()
            }
          }
        },
        { new: true }
      );
      if (!result) throw new Error(errorNames.INVALID_COMPLAINT);
      return transformComplaint(result);
    } catch (err) {
      throw err;
    }
  },

  // ── existing: upvote (unchanged logic, updated status check) ───────
  upVoteComplaint: async ({ complaintId }, req) => {
    if (!req.isAuth) throw new Error(errorNames.UNAUTHORIZED_CLIENT);
    try {
      const complaint = await Complaint.findOne({
        _id: complaintId,
        status: { $in: ['pending', 'in_progress'] }  // was 'Active'
      });
      if (!complaint) throw new Error(errorNames.INVALID_COMPLAINT);

      const isUpvoted = await getupVoteStatus(complaintId, req.userId);
      if (isUpvoted) throw new Error(errorNames.ALREADY_UPVOTED);
      if (complaint.complainee == req.userId) throw new Error(errorNames.UPVOTE_NOT_ALLOWED);

      const result = await Complaint.findByIdAndUpdate(
        { _id: complaintId },
        { $set: { upvotes: ++complaint._doc.upvotes } },
        { new: true }
      );
      const upvoter = new ComplaintUpvoter({
        user_id: req.userId,
        complaint_id: complaintId,
        createdAt: new Date()
      });
      await upvoter.save();
      return transformComplaint(result);
    } catch (err) {
      throw err;
    }
  },

  // ── existing: view complaint (unchanged) ───────────────────────────
  viewComplaint: async ({ complaintId, userId }, req) => {
    if (!req.isAuth) throw new Error(errorNames.UNAUTHORIZED_CLIENT);
    try {
      const complaint = await Complaint.findOne({ _id: complaintId });
      if (!complaint) throw new Error(errorNames.INVALID_COMPLAINT);

      const result = await Complaint.findByIdAndUpdate(
        { _id: complaintId },
        { $set: { views: ++complaint._doc.views } },
        { new: true }
      );
      return transformDetailComplaint(result, userId);
    } catch (err) {
      throw err;
    }
  },

  // ── existing: view resolved complaint (unchanged) ──────────────────
  viewResolvedComplaint: async ({ complaintId, userId }, req) => {
    if (!req.isAuth) throw new Error(errorNames.UNAUTHORIZED_CLIENT);
    try {
      const complaint = await Complaint.findOne({ _id: complaintId });
      if (!complaint) throw new Error(errorNames.INVALID_COMPLAINT);

      const result = await Complaint.findByIdAndUpdate(
        { _id: complaintId },
        { $set: { views: ++complaint._doc.views } },
        { new: true }
      );
      return transformResolvedComplaint(result);
    } catch (err) {
      throw err;
    }
  },

  // ── existing: resolveComplaint kept for backward compat ───────────
  // prefer updateComplaintStatus for new code
  resolveComplaint: async (args, req) => {
    if (!req.isAuth || req.userRole !== 'college_admin') {
      throw new Error(errorNames.UNAUTHORIZED_CLIENT);
    }
    try {
      const complaint = await Complaint.findOne({
        _id: args.resolveInput.complaintId,
        college: req.userCollege,
        status: { $in: ['pending', 'in_progress'] }
      });
      if (!complaint) throw new Error(errorNames.INVALID_COMPLAINT);

      const result = await Complaint.findByIdAndUpdate(
        { _id: args.resolveInput.complaintId },
        {
          $set: {
            status: 'resolved',
            resolvement: args.resolveInput.resolveText || '',
            resolvedAt: new Date(),
            resolvedBy: req.userId
          },
          $push: {
            statusHistory: {
              status: 'resolved',
              changedBy: req.userId,
              note: args.resolveInput.resolveText || '',
              changedAt: new Date()
            }
          }
        },
        { new: true }
      );
      return transformResolvedComplaint(result);
    } catch (err) {
      throw err;
    }
  }
};