import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  // No baseURL: requests go to the same origin the app is served from,
  // so the dev port never matters.
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
  changePassword,
  updateUser,
} = authClient