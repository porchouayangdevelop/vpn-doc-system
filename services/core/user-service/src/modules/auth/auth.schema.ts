import { BankUser } from "./../users/user.repo";
import { Type, type Static } from "@sinclair/typebox";

// ── Status response schemas ─────────────────────────────────
const ErrorBody = {
  success: Type.Boolean(),
  error: Type.String(),
  message: Type.String(),
};

export const Auth200Schema = Type.Object({
  success: Type.Boolean(),
  message: Type.Optional(Type.String()),
  data: Type.Optional(Type.Any()),
});

export const Auth400Schema = Type.Object({
  ...ErrorBody,
  detail: Type.Optional(Type.String()),
});

export const Auth401Schema = Type.Object(ErrorBody);

export const Auth403Schema = Type.Object(ErrorBody);

export const Auth500Schema = Type.Object({
  ...ErrorBody,
  stack: Type.Optional(Type.String()),
});

export type Auth200Schema = Static<typeof Auth200Schema>;
export type Auth400Schema = Static<typeof Auth400Schema>;
export type Auth401Schema = Static<typeof Auth401Schema>;
export type Auth403Schema = Static<typeof Auth403Schema>;
export type Auth500Schema = Static<typeof Auth500Schema>;

// construct the type
export const LoginDto = Type.Object({
  username: Type.String(),
  password: Type.String(),
});

export const AuthTokens = Type.Object({
  access_token: Type.String(),
  refresh_token: Type.String(),
  token_type: Type.String(),
  expires_in: Type.Number(),
});

export const LoginResponse = Type.Composite([BankUser, AuthTokens]);

export const AuthTokenResponse = Type.Object({
  access_token: Type.String(),
  refresh_token: Type.String(),
  token_type: Type.String(),
  expires_in: Type.Number(),
  refresh_expires_in: Type.Optional(Type.Number()),
  error: Type.Optional(Type.String()),
  error_description: Type.Optional(Type.String()),
});

// construct the schema
export const AuthTokenResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.Optional(Type.String()),
  message: Type.Optional(Type.String()),
  data: Type.Optional(AuthTokenResponse),
});

export const RefreshTokenDto = Type.Object({
  refresh_token: Type.String(),
});

export const ForgotPasswordDto = Type.Object({
  email: Type.String({ format: "email" }),
});

export const ResetPasswordDto = Type.Object({
  newPassword: Type.String({
    minLength: 8,
    maxLength: 128,
    pattern:
      "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
    description:
      "Must be at least 8 chars with uppercase, lowercase, number, and special character.",
  }),
});

export const ChangePasswordDto = Type.Object({
  currentPassword: Type.String(),
  newPassword: Type.String({
    minLength: 8,
    maxLength: 128,
    pattern:
      "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$",
    description:
      "Must be at least 8 chars with uppercase, lowercase, number, and special character.",
  }),
});

export type LoginDto = Static<typeof LoginDto>;
export type AuthTokens = Static<typeof AuthTokens>;
export type LoginResponse = Static<typeof LoginResponse>;
export type AuthTokenResponse = Static<typeof AuthTokenResponse>;
export type AuthTokenResponseSchema = Static<typeof AuthTokenResponseSchema>;
export type RefreshTokenDto = Static<typeof RefreshTokenDto>;
export type ForgotPasswordDto = Static<typeof ForgotPasswordDto>;
export type ResetPasswordDto = Static<typeof ResetPasswordDto>;
export type ChangePasswordDto = Static<typeof ChangePasswordDto>;
