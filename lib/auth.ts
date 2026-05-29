import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prisma } from "./db"

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
    sendResetPasswordEmail: async ({
      user,
      url,
    }: {
      user: { email: string }
      url: string
    }) => {
      // In production: integrate Resend, Nodemailer, or any SMTP provider here.
      // In development: the reset URL is printed to the terminal.
      // The developer copies the URL from the terminal and pastes it in the browser.
      console.log(`\n[DEV] Password reset link for ${user.email}:\n${url}\n`)
    },
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "CUSTOMER",
        required: false,
        input: false, // Clients cannot set this — only server actions can
      },
      isActive: {
        type: "boolean",
        defaultValue: true,
        required: false,
        input: false,
      },
      mustChangePassword: {
        type: "boolean",
        defaultValue: false,
        required: false,
        input: false,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,  // 7 days
    updateAge: 60 * 60 * 24,       // Refresh session if older than 1 day
  },

  callbacks: {
    session: ({ session, user }: any) => {
      return {
        ...session,
        user: {
          ...session.user,
          role: user?.role ?? "CUSTOMER",
          isActive: user?.isActive ?? true,
          mustChangePassword: user?.mustChangePassword ?? false,
        },
      }
    },
  },
})