import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
  },
  user:{
    additionalFields:{
      role:{
        type:"string",
        required: false,
        defaultValue:"CUSTOMER",
        input:false
      }
    }
  },
  callbacks: {
    session: async ({
      session,
      user,
    }: {
      session: any;
      user: any;
    }) => {
      return {
        ...session,
        user: {
          ...session.user,
          role: user.role, // ✅ inject role into session
        },
      };
    },
  },
});