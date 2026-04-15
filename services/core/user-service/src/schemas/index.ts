import { Type, type Static } from "@sinclair/typebox";

export const HealthResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.Optional(Type.String()),
  message: Type.Optional(Type.String()),
  data: Type.Optional(Type.Any()),
});

export const SuccessResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.Optional(Type.String()),
  message: Type.Optional(Type.String()),
  data: Type.Optional(Type.Any()),
});

export const CreateResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.Optional(Type.String()),
  message: Type.Optional(Type.String()),
  data: Type.Optional(Type.Any()),
});

export const ErrorResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.String(),
  message: Type.String(),
  data: Type.Optional(Type.Any()),
});

export const NotFoundResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.String(),
  message: Type.String(),
  data: Type.Optional(Type.Any()),
});

export const UnAuthorizedResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.String(),
  message: Type.String(),
  data: Type.Optional(Type.Any()),
});

export const ForbiddenResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.String(),
  message: Type.String(),
  data: Type.Optional(Type.Any()),
});

export const InternalServerErrorResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.String(),
  message: Type.String(),
  data: Type.Optional(Type.Any()),
});

export const NotContentResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.String(),
  message: Type.String(),
  data: Type.Optional(Type.Any()),
});

export const BadGatewayResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.String(),
  message: Type.String(),
  data: Type.Optional(Type.Any()),
});

export const BadRequestResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.String(),
  message: Type.String(),
  data: Type.Optional(Type.Any()),
});

export const ToManyRequestResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.String(),
  message: Type.String(),
  data: Type.Optional(Type.Any()),
});

export const RequestTimeOutResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.String(),
  message: Type.String(),
  data: Type.Optional(Type.Any()),
});

export const ProxyAuthHeadersResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.String(),
  message: Type.String(),
  data: Type.Optional(Type.Any()),
});

export const ConflictResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.String(),
  message: Type.String(),
  data: Type.Optional(Type.Any()),
});

export const NotAcceptableResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.String(),
  message: Type.String(),
  data: Type.Optional(Type.Any()),
});

export const MethodNotAllowedResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.String(),
  message: Type.String(),
  data: Type.Optional(Type.Any()),
});

export const UnSupportMediaTypeResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.String(),
  message: Type.String(),
  data: Type.Optional(Type.Any()),
});

export const GateWayTimeOutResponseSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.String(),
  message: Type.String(),
  data: Type.Optional(Type.Any()),
});



const $ref = Type.Ref;
export type SuccessResponseSchema = Static<typeof SuccessResponseSchema>;
export type CreateResponseSchema = Static<typeof CreateResponseSchema>;
export type ErrorResponseSchema = Static<typeof ErrorResponseSchema>;
export type NotFoundResponseSchema = Static<typeof NotFoundResponseSchema>;
export type UnAuthorizedResponseSchema = Static<
  typeof UnAuthorizedResponseSchema
>;
export type ForbiddenResponseSchema = Static<typeof ForbiddenResponseSchema>;
export type InternalServerErrorResponseSchema = Static<
  typeof InternalServerErrorResponseSchema
>;
export type NotContentResponseSchema = Static<typeof NotContentResponseSchema>;
export type BadGatewayResponseSchema = Static<typeof BadGatewayResponseSchema>;
export type BadRequestResponseSchema = Static<typeof BadRequestResponseSchema>;
export type ToManyRequestResponseSchema = Static<
  typeof ToManyRequestResponseSchema
>;
