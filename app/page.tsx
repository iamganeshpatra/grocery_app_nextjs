import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const features = [
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
  ];

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left */}
      <section className="flex items-center justify-center bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 px-5 py-10 text-white sm:px-8 lg:px-16 lg:py-16">
        <div className="w-full max-w-xl space-y-6 lg:space-y-8">
          <span className="inline-flex rounded-full bg-white/20 px-4 py-2 text-xs font-medium sm:text-sm">
            🥦 Fresh Everyday
          </span>

          <div>
            <h1 className="text-3xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
              Fresh Groceries
              <br />
              Delivered to{" "}
              <span className="text-yellow-300">Your Doorstep</span>
            </h1>

            <p className="mt-5 text-sm leading-7 text-green-100 sm:text-lg">
              Shop fresh fruits, vegetables, dairy products, snacks and daily
              essentials from trusted local grocery stores with lightning-fast
              delivery.
            </p>
          </div>

          {/* Quote */}
          <div className="border-l-4 border-yellow-300 pl-4">
            <p className="text-base italic sm:text-xl">
              "Healthy food is not an expense, it's an investment."
            </p>

            <p className="mt-2 text-sm italic text-green-100">
              "Fresh ingredients make every meal unforgettable."
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {features.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl bg-white/10 p-4 backdrop-blur-md transition hover:bg-white/20"
              >
                <div className="text-xl">{item.icon}</div>

                <h3 className="mt-2 text-sm font-semibold sm:text-base">
                  {item.title}
                </h3>

                <p className="mt-1 text-xs text-green-100 sm:text-sm">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Right */}
      <section className="flex items-center justify-center bg-gray-100 px-5 py-10 sm:px-8 lg:py-16">
        <div className="w-full max-w-sm rounded-3xl border border-green-100 bg-white p-6 shadow-2xl sm:max-w-md sm:p-10">
          <div className="text-center">
            <div className="text-5xl sm:text-6xl">🛒</div>

            <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
              Grocery Marketplace
            </h2>

            <p className="mt-3 text-sm text-gray-500 sm:text-base">
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
              asChild
              variant="outline"
              className="h-12 w-full rounded-xl border-green-300 text-base hover:bg-green-50"
            >
              <Link href="/signup">Create Account</Link>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-2 text-center text-xs text-gray-500 sm:text-sm">
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
