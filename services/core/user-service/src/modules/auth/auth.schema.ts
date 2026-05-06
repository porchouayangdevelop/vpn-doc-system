import { BankUser } from "./../users/user.repo";
import { Type, type Static } from "@sinclair/typebox";

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
  // id_token: Type.Optional(Type.String()),
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

export type LoginDto = Static<typeof LoginDto>;
export type AuthTokens = Static<typeof AuthTokens>;
export type LoginResponse = Static<typeof LoginResponse>;
export type AuthTokenResponse = Static<typeof AuthTokenResponse>;
export type AuthTokenResponseSchema = Static<typeof AuthTokenResponseSchema>;
