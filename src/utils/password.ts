import bcrypt from "bcrypt";
import { env } from "../config/env";

export const hashPassword = async (password: string): Promise<string> =>
  bcrypt.hash(password, env.app.bcryptSaltRounds);

export const comparePassword = async (
  plainPassword: string,
  passwordHash: string,
): Promise<boolean> => bcrypt.compare(plainPassword, passwordHash);
