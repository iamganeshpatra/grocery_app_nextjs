import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 px-4 py-8 sm:px-6 sm:py-12">
      {/* Header */}
      <div className="mx-auto max-w-3xl text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-800 to-green-600 text-3xl shadow-lg sm:h-20 sm:w-20 sm:text-4xl">
          Mp
        </div>

        <h1 className="bg-blue-800 bg-clip-text text-3xl font-extrabold leading-tight text-transparent sm:text-5xl">
          Join MarketPlace
        </h1>

        <p className="mt-3 text-base text-gray-900 sm:text-lg">
          Choose how you'd like to get started.
        </p>

        <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-emerald-100 bg-white/80 p-4 shadow-sm backdrop-blur sm:p-6">
          <p className="text-base italic text-emerald-700 sm:text-lg">
            “Fresh food isn't just about eating — it's about living healthier
            every day.”
          </p>

          <p className="mt-3 text-sm text-gray-500">
            Join thousands of customers and local sellers building a healthier
            community.
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="mx-auto mt-10 grid w-full max-w-5xl grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Seller */}
        <Card className="group rounded-3xl border-0 bg-white/90 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-3xl sm:h-16 sm:w-16 sm:text-4xl">
              🏪
            </div>

            <CardTitle className="text-xl text-emerald-700 sm:text-2xl">
              I'm a Seller
            </CardTitle>

            <CardDescription className="text-sm leading-6 sm:text-base">
              Create your shop, manage products, receive orders, and grow your
              business with local customers.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Button
              asChild
              className="h-11 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 font-semibold shadow-md hover:from-emerald-700 hover:to-green-600 sm:h-12"
            >
              <Link href="/signup/seller">Become a Seller</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Customer */}
        <Card className="group rounded-3xl border-0 bg-white/90 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-3xl sm:h-16 sm:w-16 sm:text-4xl">
              🛍️
            </div>

            <CardTitle className="text-xl text-orange-600 sm:text-2xl">
              I'm a Customer
            </CardTitle>

            <CardDescription className="text-sm leading-6 sm:text-base">
              Discover fresh groceries from trusted nearby shops, place orders,
              and enjoy fast doorstep delivery.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Button
              asChild
              variant="outline"
              className="h-11 w-full rounded-xl border-orange-300 text-orange-600 hover:bg-orange-50 sm:h-12"
            >
              <Link href="/signup/customer">Shop Fresh</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="mt-10 px-2 text-center">
        <p className="text-sm text-gray-600 sm:text-base">
          Already have an account?{" "}
          <Link
            href="/signin"
            className="font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Sign In
          </Link>
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-gray-400 sm:text-sm">
          <span>🌱 Fresh Products</span>
          <span>•</span>
          <span>🚚 Fast Delivery</span>
          <span>•</span>
          <span>❤️ Trusted Local Shops</span>
        </div>
      </div>
    </main>
  );
}
