import { time } from "node:console";
import { Type, type Static } from "@sinclair/typebox";

export const SuccessResponse = {
  success: Type.Boolean(),
  message: Type.Optional(Type.String()),
  data: Type.Optional(Type.Any()),
  timestamp: Type.Optional(Type.String({ format: "date-time" })),
};

export const ErrorResponse = {
  success: Type.Boolean(),
  error: Type.String(),
  message: Type.String(),
  timestamp: Type.Optional(Type.String({ format: "date-time" })),
};
