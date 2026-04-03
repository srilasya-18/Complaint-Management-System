import { buildSchema } from 'graphql';

const complaint_schema = buildSchema(`

  # ── College ───────────────────────────────────────────────────────────
  type College {
    _id: ID!
    name: String!
    emailDomain: String!
    code: String!
    location: String
    isActive: Boolean!
    createdAt: String!
  }

  # ── Status history entry (audit trail) ────────────────────────────────
  type StatusHistory {
    status: String!
    changedBy: User
    note: String
    changedAt: String!
  }

  # ── Photo attachment ───────────────────────────────────────────────────
  type Photo {
    url: String!
    filename: String
    originalName: String
    sizeKB: Int
    uploadedAt: String
  }

  # ── User ───────────────────────────────────────────────────────────────
  type User {
    _id: ID!
    name: String!
    identification_num: String!
    email: String!
    role: String!
    college: College
    isActive: Boolean!
    isVerified: Boolean!
    createdAt: String
  }

  # ── Auth ───────────────────────────────────────────────────────────────
  type AuthData {
    token: String!
    userId: String!
    role: String!
    college: String        
  }

  # ── Complaint (active) ────────────────────────────────────────────────
  type Complaint {
    _id: ID!
    complaint_category: String!
    section: String!
    department: String!
    complaint_details: String!
    createdAt: String!
    status: String!
    priority: String!
    upvotes: Int!
    views: Int!
    resolvement: String
    resolvedBy: User
    resolvedAt: String
    updatedAt: String
    complainee: User!
    college: College
    assignedTo: User
    statusHistory: [StatusHistory!]!
    photos: [Photo!]!
  }

  # ── Resolved complaint ────────────────────────────────────────────────
  type ResolvedComplaint {
    _id: ID!
    complaint_category: String!
    section: String!
    department: String!
    complaint_details: String!
    createdAt: String!
    status: String!
    priority: String!
    upvotes: Int!
    views: Int!
    resolvement: String
    resolvedBy: User!
    resolvedAt: String!
    updatedAt: String
    complainee: User!
    college: College
    assignedTo: User
    statusHistory: [StatusHistory!]!
    photos: [Photo!]!
  }

  # ── Detail view (complaint + upvote state) ────────────────────────────
  type DetailComplaint {
    complaint: Complaint!
    upvoted: Boolean!
    viewer: User!
  }

  # ── Comment ───────────────────────────────────────────────────────────
  type Comment {
    _id: ID!
    comment_text: String!
    createdAt: String!
    updatedAt: String
    complaint: Complaint!
    commenter: User!
  }

  # ── Feedback ──────────────────────────────────────────────────────────
  type Feedback {
    _id: ID!
    feedback_text: String!
    createdAt: String!
    updatedAt: String
    feedbacker: User!
    feedback_complaint: Complaint!
  }

  # ── Super admin dashboard stats ───────────────────────────────────────
  type CollegeStats {
    college: College!
    totalComplaints: Int!
    pendingCount: Int!
    inProgressCount: Int!
    resolvedCount: Int!
    rejectedCount: Int!
  }

  # ── Inputs ────────────────────────────────────────────────────────────
  input PhotoInput {
  url: String!
  filename: String
  originalName: String
  sizeKB: Int
}

input ComplaintInput {
  complaint_category: String!
  section: String!
  department: String!
  complaint_details: String!
  priority: String
  photos: [PhotoInput]
}

  input CommentInput {
    comment_text: String!
    complaint_id: ID!
  }

  input FeedbackupInput {
    feedback_text: String!
    complaint_id: ID!
  }

  input ResolveInput {
    resolveText: String
    complaintId: ID!
  }

  input UserInput {
    name: String!
    identification_num: String!
    email: String!
    password: String!
    role: String
  }

  input LogInput {
    identification_num: String!
    password: String!
    role: String
  }

  input CollegeInput {
    name: String!
    emailDomain: String!
    code: String!
    location: String
  }

  input StatusUpdateInput {
    complaintId: ID!
    status: String!
    note: String
  }

  input AssignInput {
    complaintId: ID!
    adminId: ID!
  }

  # ── Queries ───────────────────────────────────────────────────────────
  type RootQuery {
    # existing — unchanged
    listComplaints(status: String, userId: ID): [Complaint!]!
    listComments(complaintId: ID!): [Comment!]!
    login(logInput: LogInput): AuthData!
    getFeedback(complaintId: ID!): Feedback!
    viewComplaint(complaintId: ID!, userId: ID!): DetailComplaint
    viewResolvedComplaint(complaintId: ID!, userId: ID!): ResolvedComplaint

    # new — college admin
    listCollegeComplaints(status: String, priority: String): [Complaint!]!

    # new — super admin
    listColleges: [College!]!
    getCollegeStats: [CollegeStats!]!
    listAllComplaints(status: String, collegeId: ID): [Complaint!]!
    listCollegeAdmins(collegeId: ID): [User!]!
  }

  # ── Mutations ─────────────────────────────────────────────────────────
  type RootMutation {
    # existing — unchanged
    createComplaint(complaintInput: ComplaintInput): Complaint
    createUser(userInput: UserInput): User
    createComment(commentInput: CommentInput): Comment
    upVoteComplaint(complaintId: ID!): Complaint
    resolveComplaint(resolveInput: ResolveInput): ResolvedComplaint
    createFeedback(feedbackInput: FeedbackupInput!): Feedback

    # new — college admin
    updateComplaintStatus(statusInput: StatusUpdateInput!): Complaint
    assignComplaint(assignInput: AssignInput!): Complaint

    # new — super admin
    createCollege(collegeInput: CollegeInput!): College
    toggleCollegeStatus(collegeId: ID!): College
    createCollegeAdmin(userInput: UserInput!, collegeId: ID!): User
    toggleUserStatus(userId: ID!): User
    createSuperAdmin(userInput: UserInput!, secretCode: String!): User
  }

  schema {
    query: RootQuery
    mutation: RootMutation
  }
`);

export default complaint_schema;