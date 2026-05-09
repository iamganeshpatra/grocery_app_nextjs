import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ForgotPasswordPage = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">

      <Card className="w-[360px] shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold">
            Forgot Password
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          <p className="text-sm text-gray-500 text-center">
            Enter your Gmail and we’ll send a reset link
          </p>

          {/* Email */}
          <Input type="email" placeholder="Enter Gmail" />

          {/* Send Button */}
          <Button className="w-full">
            Send Reset Link
          </Button>

          {/* Back to Login */}
          <p className="text-sm text-center text-gray-500">
            Remember your password?{" "}
            <Link href="/signin" className="text-green-600 hover:underline">
              Sign In
            </Link>
          </p>

        </CardContent>
      </Card>

    </div>
  );
};

export default ForgotPasswordPage;