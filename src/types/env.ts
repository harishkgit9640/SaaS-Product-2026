export interface AppConfig {
  nodeEnv: string;
  port: number;
  bcryptSaltRounds: number;
  cronEnabled: boolean;
}

export interface DbConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
  ssl: boolean;
}

export interface JwtConfig {
  accessSecret: string;
  accessExpiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
}

export interface EnvConfig {
  app: AppConfig;
  db: DbConfig;
  jwt: JwtConfig;
  razorpay: {
    keyId: string;
    keySecret: string;
    webhookSecret: string;
  };
  notifications: {
    emailEnabled: boolean;
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string;
    smtpPass: string;
    fromEmail: string;
    fromName: string;
  };
}
