import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { JwtPayload } from "../types/auth";

export const signAccessToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: env.jwt.accessExpiresIn as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, env.jwt.accessSecret, options);
};

export const signRefreshToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: env.jwt.refreshExpiresIn as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, env.jwt.refreshSecret, options);
};

export const verifyAccessToken = (token: string): JwtPayload =>
  jwt.verify(token, env.jwt.accessSecret) as JwtPayload;

export const verifyRefreshToken = (token: string): JwtPayload =>
  jwt.verify(token, env.jwt.refreshSecret) as JwtPayload;
