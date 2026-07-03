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

export interface GeneratedPhoneLink {
  url: string;
  phone: string;
  message?: string;
}
