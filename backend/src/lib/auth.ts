import { betterAuth } from "better-auth";
import { username, anonymous } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  basePath: "/api/auth",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET || process.env.JWT_SECRET || "fallback-secret-min-32-chars!!",
  trustedOrigins: [
    "http://localhost:5173",
    "http://localhost:3000",
    process.env.FRONTEND_URL || "http://localhost:5173",
  ],

  emailAndPassword: {
    enabled: true,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || ""
    },
  },

  user: {
    additionalFields: {
      tier: {
        type: "string",
        defaultValue: "free",
        input: false, // don't accept from client, server-side only
      },
    },
  },

  plugins: [
    username(),
    anonymous({
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        console.log(`Linking anonymous ${anonymousUser.user.id} to ${newUser.user.id}`);
      },
    }),
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,     // 1 day
  },
});

export type Session = typeof auth.$Infer.Session;
