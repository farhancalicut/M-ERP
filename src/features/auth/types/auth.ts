export interface LoginPayload {
  email?: string;
  password?: string;
}

export interface FirstLoginPayload {
  email?: string;
  temporaryPassword?: string;
  newPassword?: string;
}

export interface ResetPasswordPayload {
  email: string;
}
