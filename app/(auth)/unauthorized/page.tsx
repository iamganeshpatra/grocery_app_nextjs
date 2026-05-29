import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
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
  );
}
