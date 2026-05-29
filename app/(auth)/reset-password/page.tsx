import { Suspense } from "react";
import ResetPasswordForm from "./reset-password";

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
