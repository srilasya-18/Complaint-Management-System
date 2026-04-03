import { gql } from '@apollo/client';


export const LOGIN = gql`
  query Login($logInput : LogInput) {
    login(logInput: $logInput ) {
      token
    }
  }
`;

export const SIGNUP = gql`
  mutation SignUp($userInput : UserInput) {
    createUser(userInput: $userInput ) {
      _id
      name
    }
  }
`;

export const CREATE_SUPER_ADMIN = gql`
  mutation CreateSuperAdmin($userInput: UserInput!, $secretCode: String!) {
    createSuperAdmin(userInput: $userInput, secretCode: $secretCode) {
      _id
      name
    }
  }
`;

