export interface UsernameValidationResult {
  valid: boolean;
  errors: string[];
}

export interface GeneratedLink {
  url: string;
  username: string;
  usernameKey?: string;
  message?: string;
}
