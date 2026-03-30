import { gql } from "@apollo/client";

export const LIST_COMPLAINTS_FEW = gql`
  query LIST_COMPLAINTS_FEW($status: String, $userId: ID) {
    listComplaints(status: $status, userId: $userId) {
      _id
      complaint_category
      section
      complainee {
        name
      }
    }
  }
`;

export const RESOLVE_COMPLAINT = gql`
  mutation ResolveComplaint($resolveInput: ResolveInput) {
    resolveComplaint(resolveInput: $resolveInput) {
      _id
    }
  }
`;

export const VIEW_COMPLAINT = gql`
  query VIEW_COMPLAINT($complaintId: ID!, $userId: ID!) {
    viewComplaint(complaintId: $complaintId, userId: $userId) {
      complaint {
        _id
        complaint_category
        section
        department
        complaint_details
        createdAt
        status
        upvotes
        views
        complainee {
          _id
        }
      }
      upvoted
      viewer {
        _id
      }
    }
  }
`;

export const VIEW_RESOLVED_COMPLAINT = gql`
  query VIEW_RESOLVED_COMPLAINT($complaintId: ID!, $userId: ID!) {
    viewResolvedComplaint(complaintId: $complaintId, userId: $userId) {
        _id
        complaint_category
        section
        department
        complaint_details
        createdAt
        status
        upvotes
        views
        resolvement
        resolvedBy {
          name
        }
        resolvedAt
        complainee {
          _id
        }
    }
  }
`;

export const VIEW_COMPLAINTS = gql`
  query ViewComplaints($complaintId: ID, $userId: ID) {
    viewComplaints(complaintId: $complaintId, userId: $userId) {
      _id
    }
  }
`;

export const CREATE_COMPLAINT = gql`
  mutation CreateComplaint($complaintInput: ComplaintInput) {
    createComplaint(complaintInput: $complaintInput) {
      _id
    }
  }
`;

export const UPVOTE_COMPLAINT = gql`
  mutation UPVOTE_Complaint($complaintId: ID!) {
    upVoteComplaint(complaintId: $complaintId) {
      upvotes
    }
  }
`;

// ── new: college admin dashboard ──────────────────────────────────────

export const LIST_COLLEGE_COMPLAINTS = gql`
  query LIST_COLLEGE_COMPLAINTS($status: String, $priority: String) {
    listCollegeComplaints(status: $status, priority: $priority) {
      _id
      complaint_category
      section
      department
      complaint_details
      status
      priority
      upvotes
      views
      createdAt
      photos {
        url
        sizeKB
      }
      complainee {
        _id
        name
      }
      assignedTo {
        _id
        name
      }
      statusHistory {
        status
        note
        changedAt
        changedBy {
          name
        }
      }
      college {
        _id
        name
      }
    }
  }
`;

export const UPDATE_COMPLAINT_STATUS = gql`
  mutation UPDATE_COMPLAINT_STATUS($statusInput: StatusUpdateInput!) {
    updateComplaintStatus(statusInput: $statusInput) {
      _id
      status
      statusHistory {
        status
        note
        changedAt
        changedBy {
          name
        }
      }
    }
  }
`;