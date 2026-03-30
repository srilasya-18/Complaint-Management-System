import { gql } from "@apollo/client";

export const LIST_COLLEGES = gql`
  query LIST_COLLEGES {
    listColleges {
      _id
      name
      emailDomain
      code
      location
      isActive
      createdAt
    }
  }
`;

export const GET_COLLEGE_STATS = gql`
  query GET_COLLEGE_STATS {
    getCollegeStats {
      college {
        _id
        name
        code
      }
      totalComplaints
      pendingCount
      inProgressCount
      resolvedCount
      rejectedCount
    }
  }
`;

export const CREATE_COLLEGE = gql`
  mutation CREATE_COLLEGE($collegeInput: CollegeInput!) {
    createCollege(collegeInput: $collegeInput) {
      _id
      name
      emailDomain
      code
      location
      isActive
    }
  }
`;

export const CREATE_COLLEGE_ADMIN = gql`
  mutation CREATE_COLLEGE_ADMIN($userInput: UserInput!, $collegeId: ID!) {
    createCollegeAdmin(userInput: $userInput, collegeId: $collegeId) {
      _id
      name
      email
    }
  }
`;

export const TOGGLE_COLLEGE_STATUS = gql`
  mutation TOGGLE_COLLEGE_STATUS($collegeId: ID!) {
    toggleCollegeStatus(collegeId: $collegeId) {
      _id
      isActive
    }
  }
`;