import { Type, type Static } from "@sinclair/typebox";
import type { BankUser } from "../users/user.service";
export const LoginSchema = Type.Object({
  email: Type.String(),
  password: Type.String(),
});

export const AuthenTokenSchema = Type.Object({
  access_token: Type.String(),
  refresh_token: Type.String(),
  token_type: Type.String(),
  expires_in: Type.Number(),
});

export const LoginResponse = Type.Object({
  access_token: Type.String(),
  refresh_token: Type.String(),
  token_type: Type.String(),
  expires_in: Type.Number(),
  user: Type.Any(),
});

export const LoginResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.Optional(Type.String()),
  message: Type.Optional(Type.String()),
  data: Type.Optional(AuthenTokenSchema),
});

export const AuthentikTokenResponse = Type.Object({
  access_token: Type.String(),
  refresh_token: Type.String(),
  token_type: Type.String(),
  expires_in: Type.Number(),
  id_token: Type.Optional(Type.String()),
  error: Type.Optional(Type.String()),
  error_description: Type.Optional(Type.String()),
});

export const AuthentikTokenResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.Optional(Type.String()),
  message: Type.Optional(Type.String()),
  data: Type.Optional(AuthentikTokenResponse),
});

export type LoginDto = Static<typeof LoginSchema>;
export type AuthenTokens = Static<typeof AuthenTokenSchema>;
export type LoginResponse = Static<typeof LoginResponse>;
export type AuthentikTokenResponse = Static<typeof AuthentikTokenResponse>;
export type AuthentikResponse = Static<typeof AuthentikTokenResponse>;
