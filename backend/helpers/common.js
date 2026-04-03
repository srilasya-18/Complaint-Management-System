import User from '../models/user.js';
import ComplaintUpvoter from '../models/complaint_upvoters.js';
import Complaint from '../models/complaint.js';
import { errorNames } from './errorConstants.js';

const dateToString = date => {
  try {
    if (!date) return null;
    return new Date(date).toISOString();
  } catch {
    return null;
  }
};

// ── resolve a user — handles both ObjectId and already-populated object ──
const user = async userId => {
  if (!userId) return null;

  // already populated by mongoose .populate() — just return it
  if (typeof userId === 'object' && userId.name) {
    return {
      ...userId._doc,
      _id: userId.id || userId._id,
      role: userId._doc?.role || 'student',
      isActive: userId._doc?.isActive ?? true,
      isVerified: userId._doc?.isVerified ?? false,
      college: null
    };
  }

  // raw ObjectId — fetch from DB
  try {
    const found = await User.findById(userId, {
      name: 1, identification_num: 1, _id: 1, email: 1,
      role: 1, isActive: 1, isVerified: 1
    });
    if (!found) return null;
    return {
      ...found._doc,
      _id: found.id,
      role: found._doc.role || 'student',
      isActive: found._doc.isActive ?? true,
      isVerified: found._doc.isVerified ?? false,
      college: null
    };
  } catch (err) {
    return null;
  }
};

// ── resolve a college — handles both ObjectId and populated object ────────
const resolveCollege = async (collegeRef) => {
  if (!collegeRef) return null;

  // already populated
  if (typeof collegeRef === 'object' && collegeRef.name) {
    return {
      _id:         collegeRef._id || collegeRef.id,
      name:        collegeRef.name,
      emailDomain: collegeRef.emailDomain || '',
      code:        collegeRef.code || '',
      location:    collegeRef.location || null,
      isActive:    collegeRef.isActive ?? true,
      createdAt:   dateToString(collegeRef.createdAt) || new Date().toISOString()
    };
  }

  // raw ObjectId — fetch from DB
  try {
    const College = (await import('../models/college.js')).default;
    const found = await College.findById(collegeRef);
    if (!found) return null;
    return {
      _id:         found.id,
      name:        found.name,
      emailDomain: found.emailDomain,
      code:        found.code,
      location:    found.location || null,
      isActive:    found.isActive,
      createdAt:   dateToString(found.createdAt)
    };
  } catch {
    return null;
  }
};

// ── resolve statusHistory array ───────────────────────────────────────────
const resolveStatusHistory = (statusHistory) => {
  if (!statusHistory || !Array.isArray(statusHistory)) return [];
  return statusHistory.map(entry => ({
    status:    entry.status || '',
    note:      entry.note || '',
    changedAt: dateToString(entry.changedAt) || new Date().toISOString(),
    changedBy: entry.changedBy
      ? (typeof entry.changedBy === 'object' && entry.changedBy.name
          ? user.bind(null, entry.changedBy)
          : user.bind(null, entry.changedBy))
      : null
  }));
};

// ── resolve photos array ──────────────────────────────────────────────────
const resolvePhotos = (photos) => {
  if (!photos || !Array.isArray(photos)) return [];
  return photos.map(p => ({
    url:          p.url || '',
    filename:     p.filename || null,
    originalName: p.originalName || null,
    sizeKB:       p.sizeKB || null,
    uploadedAt:   dateToString(p.uploadedAt) || null
  }));
};

// ── main transformComplaint ───────────────────────────────────────────────
const transformComplaint = complaint => {
  const doc = complaint._doc || complaint;
  return {
    ...doc,
    _id:               complaint.id || doc._id,
    createdAt:         dateToString(doc.createdAt),
    updatedAt:         dateToString(doc.updatedAt),
    resolvedAt:        dateToString(doc.resolvedAt),
    priority:          doc.priority || 'medium',
    status:            doc.status || 'pending',
    upvotes:           doc.upvotes || 0,
    views:             doc.views || 0,
    resolvement:       doc.resolvement || '',
    photos:            resolvePhotos(doc.photos),
    statusHistory:     resolveStatusHistory(doc.statusHistory),

    // relations — lazy resolve if not populated, direct if populated
    complainee:  user.bind(null, doc.complainee),
    resolvedBy:  doc.resolvedBy  ? user.bind(null, doc.resolvedBy)  : null,
    assignedTo:  doc.assignedTo  ? user.bind(null, doc.assignedTo)  : null,
    college:     resolveCollege.bind(null, doc.college),
  };
};

// ── transformResolvedComplaint ────────────────────────────────────────────
const transformResolvedComplaint = complaint => {
  const doc = complaint._doc || complaint;
  return {
    ...doc,
    _id:           complaint.id || doc._id,
    createdAt:     dateToString(doc.createdAt),
    updatedAt:     dateToString(doc.updatedAt),
    resolvedAt:    dateToString(doc.resolvedAt),
    priority:      doc.priority || 'medium',
    status:        doc.status || 'pending',
    upvotes:       doc.upvotes || 0,
    views:         doc.views || 0,
    photos:        resolvePhotos(doc.photos),
    statusHistory: resolveStatusHistory(doc.statusHistory),
    complainee:    user.bind(null, doc.complainee),
    resolvedBy:    doc.resolvedBy ? user.bind(null, doc.resolvedBy) : null,
    assignedTo:    doc.assignedTo ? user.bind(null, doc.assignedTo) : null,
    college:       resolveCollege.bind(null, doc.college),
  };
};

// ── transformDetailComplaint ──────────────────────────────────────────────
const transformDetailComplaint = (complaint, userId) => {
  return {
    complaint: transformComplaint(complaint),
    upvoted:   getupVoteStatus(complaint.id, userId),
    viewer:    user.bind(null, userId)
  };
};

// ── getComplaint ──────────────────────────────────────────────────────────
const getComplaint = async (id, req_status = null) => {
  let conditions = { _id: id };
  if (req_status) conditions.status = req_status;
  return await Complaint.findOne(conditions);
};

// ── transformFeedback ─────────────────────────────────────────────────────
const transformFeedback = async feedback => {
  const doc = feedback._doc || feedback;
  return {
    ...doc,
    _id:               feedback.id || doc._id,
    createdAt:         dateToString(doc.createdAt),
    updatedAt:         dateToString(doc.updatedAt),
    feedbacker:        user.bind(null, doc.feedbacker),
    feedback_complaint: transformComplaint.bind(null, await getComplaint(doc.complaint))
  };
};

// ── transformComment ──────────────────────────────────────────────────────
const transformComment = async (comment, commented_complaint = null) => {
  const doc = comment._doc || comment;
  return {
    ...doc,
    _id:       comment.id || doc._id,
    createdAt: dateToString(doc.createdAt),
    updatedAt: dateToString(doc.updatedAt),
    complaint: commented_complaint ?? transformComplaint.bind(null, await getComplaint(doc.complaint)),
    commenter: user.bind(null, doc.commenter)
  };
};

// ── getupVoteStatus ───────────────────────────────────────────────────────
const getupVoteStatus = async (cid, uid) => {
  try {
    const upvoter = await ComplaintUpvoter.findOne({
      complaint_id: cid,
      user_id: uid
    });
    return upvoter ? true : false;
  } catch {
    return false;
  }
};

export {
  transformComplaint,
  transformDetailComplaint,
  transformComment,
  getComplaint,
  transformFeedback,
  transformResolvedComplaint,
  getupVoteStatus
};