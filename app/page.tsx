import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left Section */}
      <section className="flex items-center justify-center bg-gradient-to-br from-green-700 via-green-500 to-emerald-500 text-white px-6 py-12 sm:px-10 lg:px-16">
        <div className="max-w-xl w-full space-y-8">
          <span className="inline-block rounded-full bg-white/20 px-4 py-2 text-sm">
            🥦 Fresh Everyday
          </span>

          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              Fresh Groceries
              <br />
              Delivered to{" "}
              <span className="text-yellow-300">Your Doorstep</span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-green-100 leading-7">
              Shop fresh fruits, vegetables, dairy products, snacks and daily
              essentials from trusted local stores with lightning-fast delivery.
            </p>
          </div>

          {/* Quotes */}
          <div className="border-l-4 border-yellow-300 pl-5 space-y-3">
            <p className="italic text-lg sm:text-xl">
              "Healthy food is not an expense, it's an investment."
            </p>

            <p className="italic text-green-100">
              "Fresh ingredients make every meal unforgettable."
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                icon: "🚚",
                title: "Fast Delivery",
                desc: "Delivered within hours.",
              },
              {
                icon: "🥬",
                title: "Farm Fresh",
                desc: "Fresh products every day.",
              },
              {
                icon: "💳",
                title: "Easy Payments",
                desc: "Secure online payments.",
              },
              {
                icon: "⭐",
                title: "Trusted Shops",
                desc: "Verified local grocery stores.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl bg-white/10 backdrop-blur-md p-5 transition hover:bg-white/20"
              >
                <h3 className="text-lg font-semibold">
                  {item.icon} {item.title}
                </h3>

                <p className="mt-2 text-sm text-green-100">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Right Section */}
      <section className="flex items-center justify-center bg-gray-200 px-6 py-12 sm:px-10">
        <div className="w-full max-w-md rounded-3xl border bg-green-200 p-8 shadow-2xl sm:p-10">
          <div className="text-center">
            <div className="text-5xl sm:text-6xl">🛒</div>

            <h2 className="mt-4 text-3xl font-bold">Grocery Marketplace</h2>

            <p className="mt-3 text-gray-500">
              Buy fresh groceries from nearby stores anytime.
            </p>
          </div>

          <div className="mt-8 space-y-4">
            <Button
              asChild
              className="h-12 w-full rounded-xl bg-green-600 text-base hover:bg-green-700"
            >
              <Link href="/signin">Sign In</Link>
            </Button>

            <Button
              variant="outline"
              asChild
              className="h-12 w-full rounded-xl text-base"
            >
              <Link href="/signup">Create Account</Link>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-2 text-center text-sm text-gray-500">
            <span>🥦 Fresh</span>
            <span>•</span>
            <span>🚚 Fast Delivery</span>
            <span>•</span>
            <span>⭐ Trusted Stores</span>
          </div>
        </div>
      </section>
    </main>
  );
}
