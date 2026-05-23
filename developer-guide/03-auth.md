# Developer Guide — 03: Authentication

This document covers the complete authentication implementation:
- Updated `lib/auth.ts` and `lib/auth-client.ts`
- `proxy.ts` — route protection for all roles
- All auth pages: sign in, sign up, forgot password, reset password, change password, profile
- Auth server actions

Work through each section in order. Create each file exactly as shown.

---

## Overview of the Auth Flow

```
User visits /shop-owner/new (protected)
      │
      ▼
proxy.ts runs — no session found → redirect to /signin?redirect=/shop-owner/new
      │
      ▼
User fills in /signin → authClient.signIn.email()
      │
      ▼
better-auth sets session cookie → redirect to /auth-redirect
      │
      ▼
/auth-redirect (server) reads session role → redirect to /shop-owner
```

For signup:
```
User fills /signup/seller → authClient.signUp.email() → server action sets role to SHOP_OWNER
      │
      ▼
redirect to /auth-redirect → role read → /shop-owner
```

---

## Step 1 — Update lib/auth.ts

Replace the entire contents of `lib/auth.ts`:

```typescript
// lib/auth.ts
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
```

**Why `input: false` on additionalFields?**  
Prevents malicious clients from calling `signUp.email({ role: "SUPER_ADMIN" })`. Role changes happen exclusively through server actions that verify the current session.

---

## Step 2 — Update lib/auth-client.ts

Replace the entire contents of `lib/auth-client.ts`:

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
})

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  forgetPassword,
  resetPassword,
  changePassword,
  updateUser,
} = authClient
```

---

## Step 3 — Create proxy.ts

Create this file at the project root (same level as `next.config.ts`):

```typescript
// proxy.ts
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"

// These paths are accessible without logging in
const PUBLIC_PATHS = [
  "/",
  "/signin",
  "/signup",
  "/signup/seller",
  "/signup/customer",
  "/forgot-password",
  "/reset-password",
  "/unauthorized",
]

// Role → allowed route prefix
const ROLE_PREFIX: Record<string, string> = {
  SUPER_ADMIN: "/admin",
  SHOP_OWNER: "/shop-owner",
  SHOP_MANAGER: "/manager",
  CUSTOMER: "/customer",
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Always pass through API routes and Next.js internals
  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) {
    return NextResponse.next()
  }

  // 2. Always pass through the role-redirect helper and forced-change-password pages
  if (pathname === "/auth-redirect" || pathname === "/change-password" || pathname === "/profile") {
    return NextResponse.next()
  }

  // 3. Allow public routes
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  )
  if (isPublic) return NextResponse.next()

  // 4. Get the session
  const session = await auth.api.getSession({ headers: request.headers })

  // 5. Not logged in → redirect to sign in
  if (!session) {
    const url = new URL("/signin", request.url)
    url.searchParams.set("redirect", pathname)
    return NextResponse.redirect(url)
  }

  const { role, isActive, mustChangePassword } = session.user as {
    role: string
    isActive: boolean
    mustChangePassword: boolean
  }

  // 6. Deactivated account
  if (!isActive) {
    return NextResponse.redirect(
      new URL("/unauthorized?reason=deactivated", request.url)
    )
  }

  // 7. Manager must change password before going anywhere else
  if (mustChangePassword && pathname !== "/change-password") {
    return NextResponse.redirect(new URL("/change-password", request.url))
  }

  // 8. Role-based route guard
  const allowedPrefix = ROLE_PREFIX[role]
  if (allowedPrefix && !pathname.startsWith(allowedPrefix)) {
    return NextResponse.redirect(new URL("/unauthorized", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
```

**Important:** In Next.js 16, this file is called `proxy.ts` (not `middleware.ts`).  
The exported function must be named `proxy`.

---

## Step 4 — Create Auth Server Actions

Create the file `actions/auth.actions.ts`:

```typescript
// actions/auth.actions.ts
"use server"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/db"

// Called after signUp.email() succeeds for seller signup
// Updates the current user's role to SHOP_OWNER
export async function completeSellerSignup() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { role: "SHOP_OWNER" },
  })

  return { success: true }
}

// Called after signUp.email() succeeds for customer signup
// Role defaults to CUSTOMER but this confirms it explicitly
export async function completeCustomerSignup() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { role: "CUSTOMER" },
  })

  return { success: true }
}
```

---

## Step 5 — Update app/layout.tsx

Update the root layout with proper metadata:

```tsx
// app/layout.tsx
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Grocery Marketplace",
  description: "Local grocery marketplace platform",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
```

---

## Step 6 — Create app/page.tsx (Landing Page)

```tsx
// app/page.tsx
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Grocery Marketplace</h1>
        <p className="text-muted-foreground text-lg">
          Fresh groceries from local shops, delivered to your door.
        </p>
      </div>

      <div className="flex gap-4">
        <Button asChild>
          <Link href="/signin">Sign In</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/signup">Sign Up</Link>
        </Button>
      </div>
    </main>
  )
}
```

---

## Step 7 — Create app/auth-redirect/page.tsx

This is a server component that reads the session role and redirects to the correct dashboard.

```tsx
// app/auth-redirect/page.tsx
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

const ROLE_ROUTES: Record<string, string> = {
  SUPER_ADMIN: "/admin",
  SHOP_OWNER: "/shop-owner",
  SHOP_MANAGER: "/manager",
  CUSTOMER: "/customer",
}

export default async function AuthRedirectPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/signin")
  }

  const role = session.user.role as string
  const destination = ROLE_ROUTES[role] ?? "/signin"
  redirect(destination)
}
```

---

## Step 8 — Create app/unauthorized/page.tsx

```tsx
// app/unauthorized/page.tsx
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold">Access Denied</h1>
      <p className="text-muted-foreground max-w-md">
        You do not have permission to view this page.
      </p>
      <Button asChild>
        <Link href="/signin">Back to Sign In</Link>
      </Button>
    </main>
  )
}
```

---

## Step 9 — Create app/signup/page.tsx

This page lets users choose whether they are a seller or a customer.

```tsx
// app/signup/page.tsx
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SignupPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Create an Account</h1>
        <p className="text-muted-foreground mt-1">How will you use Grocery Marketplace?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>I&apos;m a Seller</CardTitle>
            <CardDescription>
              Create a shop, list products from the catalog, and start selling to local customers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/signup/seller">Sign Up as Seller</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>I&apos;m a Customer</CardTitle>
            <CardDescription>
              Browse products from local shops, place orders, and track deliveries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="outline">
              <Link href="/signup/customer">Sign Up as Customer</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/signin" className="underline">
          Sign in
        </Link>
      </p>
    </main>
  )
}
```

---

## Step 10 — Create app/signup/seller/page.tsx

```tsx
// app/signup/seller/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { signUp } from "@/lib/auth-client"
import { completeSellerSignup } from "@/actions/auth.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SellerSignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    setLoading(true)

    // Step 1: Create the account (role defaults to CUSTOMER)
    const result = await signUp.email({
      email,
      password,
      name: `${firstName.trim()} ${lastName.trim()}`,
    })

    if (result.error) {
      toast.error(result.error.message ?? "Sign up failed")
      setLoading(false)
      return
    }

    // Step 2: Update role to SHOP_OWNER (only runs if signup succeeded)
    const roleResult = await completeSellerSignup()
    if (roleResult.error) {
      toast.error("Account created but role update failed. Contact support.")
      setLoading(false)
      return
    }

    // Step 3: Redirect — auth-redirect will read the updated role
    router.push("/auth-redirect")
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Seller Account</CardTitle>
          <CardDescription>Start selling on Grocery Marketplace</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">First Name</label>
                <Input
                  required
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Last Name</label>
                <Input
                  required
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                required
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                required
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Confirm Password</label>
              <Input
                type="password"
                required
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create Seller Account"}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link href="/signin" className="underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
```

---

## Step 11 — Create app/signup/customer/page.tsx

```tsx
// app/signup/customer/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { signUp } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CustomerSignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    setLoading(true)

    const result = await signUp.email({
      email,
      password,
      name: `${firstName.trim()} ${lastName.trim()}`,
    })

    if (result.error) {
      toast.error(result.error.message ?? "Sign up failed")
      setLoading(false)
      return
    }

    // Role is already CUSTOMER by default — go straight to redirect
    router.push("/auth-redirect")
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Customer Account</CardTitle>
          <CardDescription>Shop from local grocery stores</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">First Name</label>
                <Input
                  required
                  placeholder="Jane"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Last Name</label>
                <Input
                  required
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                required
                placeholder="jane@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                required
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Confirm Password</label>
              <Input
                type="password"
                required
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create Customer Account"}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link href="/signin" className="underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
```

---

## Step 12 — Create app/signin/page.tsx

```tsx
// app/signin/page.tsx
"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { signIn } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Suspense } from "react"

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const result = await signIn.email({ email, password })

    if (result.error) {
      toast.error(result.error.message ?? "Invalid credentials")
      setLoading(false)
      return
    }

    // Redirect to the page they were trying to reach, or to the role-based dashboard
    const redirectTo = searchParams.get("redirect") ?? "/auth-redirect"
    router.push(redirectTo)
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Welcome Back</CardTitle>
        <CardDescription>Sign in to your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Password</label>
              <Link href="/forgot-password" className="text-xs text-muted-foreground underline">
                Forgot password?
              </Link>
            </div>
            <Input
              type="password"
              required
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="text-sm text-center text-muted-foreground mt-4">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <Suspense>
        <SignInForm />
      </Suspense>
    </main>
  )
}
```

**Note:** The `<Suspense>` wrapper is required because `useSearchParams()` needs it in Next.js 16.

---

## Step 13 — Create app/forgot-password/page.tsx

```tsx
// app/forgot-password/page.tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { forgetPassword } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    await forgetPassword({
      email,
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    })

    // Always show success — never reveal whether the email exists
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Check Your Email</CardTitle>
            <CardDescription>
              If an account exists for <strong>{email}</strong>, a password reset link has been sent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              During development, the reset link is printed to the terminal where{" "}
              <code>npm run dev</code> is running.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/signin">Back to Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Forgot Password</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send you a reset link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-4">
            Remember it?{" "}
            <Link href="/signin" className="underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
```

---

## Step 14 — Create app/reset-password/page.tsx

This page is reached by clicking the link in the reset email. The URL contains a `token` query parameter.

```tsx
// app/reset-password/page.tsx
"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { resetPassword } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  if (!token) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invalid Link</CardTitle>
          <CardDescription>
            This password reset link is invalid or has expired.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/forgot-password">Request a New Link</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    setLoading(true)

    const result = await resetPassword({ newPassword, token })

    if (result.error) {
      toast.error(result.error.message ?? "Reset failed. The link may have expired.")
      setLoading(false)
      return
    }

    toast.success("Password updated! Please sign in.")
    router.push("/signin")
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Set New Password</CardTitle>
        <CardDescription>Enter your new password below.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">New Password</label>
            <Input
              type="password"
              required
              placeholder="Minimum 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Confirm New Password</label>
            <Input
              type="password"
              required
              placeholder="Repeat new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </main>
  )
}
```

---

## Step 15 — Create app/change-password/page.tsx

This page is only shown to Shop Managers on their first login. `proxy.ts` forces them here automatically.

```tsx
// app/change-password/page.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { changePassword } from "@/lib/auth-client"
import { clearMustChangePassword } from "@/actions/auth.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ChangePasswordPage() {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    setLoading(true)

    const result = await changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: false,
    })

    if (result.error) {
      toast.error(result.error.message ?? "Password change failed")
      setLoading(false)
      return
    }

    // Clear the mustChangePassword flag
    await clearMustChangePassword()

    toast.success("Password updated successfully!")
    router.push("/auth-redirect")
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set Your Password</CardTitle>
          <CardDescription>
            You must set a new password before continuing. Your account was created with a
            temporary password by your shop owner.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Temporary Password</label>
              <Input
                type="password"
                required
                placeholder="Enter the temporary password given to you"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">New Password</label>
              <Input
                type="password"
                required
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Confirm New Password</label>
              <Input
                type="password"
                required
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating..." : "Set Password & Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
```

Add `clearMustChangePassword` to `actions/auth.actions.ts`:

```typescript
// Add this to actions/auth.actions.ts

export async function clearMustChangePassword() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { mustChangePassword: false },
  })

  return { success: true }
}
```

---

## Step 16 — Create app/profile/page.tsx

This page is accessible to all authenticated roles.

```tsx
// app/profile/page.tsx
"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useSession, changePassword, updateUser } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ProfilePage() {
  const { data: session, isPending } = useSession()

  const [name, setName] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [nameLoading, setNameLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  if (isPending) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>
  }

  if (!session) {
    return <div className="p-8 text-center text-muted-foreground">Not signed in</div>
  }

  async function handleNameUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Name cannot be empty")
      return
    }

    setNameLoading(true)
    const result = await updateUser({ name: name.trim() })

    if (result.error) {
      toast.error(result.error.message ?? "Update failed")
    } else {
      toast.success("Name updated")
      setName("")
    }
    setNameLoading(false)
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters")
      return
    }

    setPasswordLoading(true)
    const result = await changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: false,
    })

    if (result.error) {
      toast.error(result.error.message ?? "Password change failed")
    } else {
      toast.success("Password updated")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    }
    setPasswordLoading(false)
  }

  return (
    <main className="max-w-2xl mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      {/* Current Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Name: </span>
            <span className="font-medium">{session.user.name}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Email: </span>
            <span className="font-medium">{session.user.email}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Role: </span>
            <span className="font-medium">{(session.user as any).role}</span>
          </div>
        </CardContent>
      </Card>

      {/* Update Name */}
      <Card>
        <CardHeader>
          <CardTitle>Update Name</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleNameUpdate} className="space-y-3">
            <Input
              placeholder="New name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button type="submit" disabled={nameLoading}>
              {nameLoading ? "Saving..." : "Save Name"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Current Password</label>
              <Input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">New Password</label>
              <Input
                type="password"
                required
                placeholder="Minimum 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Confirm New Password</label>
              <Input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
```

---

## Step 17 — Install Missing shadcn Components

Some pages use `Card` which may not be installed yet. Install it:

```bash
npx shadcn@latest add card
npx shadcn@latest add label
```

After running, check `components/ui/` for the new files.

---

## Step 18 — Test Authentication

Start the dev server:

```bash
npm run dev
```

Test each flow in order:

1. **Visit** `http://localhost:3000` → see landing page
2. **Visit** `/signup` → see seller/customer choice
3. **Create a seller account** at `/signup/seller` → should land on `/shop-owner`
4. **Sign out** (we'll add a sign-out button in the shop-owner layout in doc 04)
5. **Sign in** at `/signin` → should land on `/shop-owner`
6. **Test forgot password**: go to `/forgot-password`, submit email, look at the terminal — the reset link is printed there
7. **Copy the reset link** from the terminal, paste in browser → should show reset password form
8. **Submit new password** → should redirect to `/signin`
9. **Verify proxy.ts**: while signed out, visit `/shop-owner` directly → should redirect to `/signin`
10. **Verify role guard**: sign in as a seller, then visit `/customer` directly → should redirect to `/unauthorized`

---

## Full actions/auth.actions.ts (Complete File)

Here is the complete file with all actions from this document:

```typescript
// actions/auth.actions.ts
"use server"

import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { prisma } from "@/lib/db"

export async function completeSellerSignup() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { role: "SHOP_OWNER" },
  })

  return { success: true }
}

export async function completeCustomerSignup() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { role: "CUSTOMER" },
  })

  return { success: true }
}

export async function clearMustChangePassword() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: "Not authenticated" }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { mustChangePassword: false },
  })

  return { success: true }
}
```

Now proceed to `04-shop-owner.md`.
