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
    <main className="min-h-screen bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-16">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold tracking-wide sm:text-3xl">
            <span className="text-blue-800">Market</span>
            <span className="text-orange-400">Place</span>
          </h2>

          <div className="flex gap-2">
            <Button
              asChild
              size="sm"
              className="bg-gray-700 text-green-300 hover:bg-green-100"
            >
              <Link href="/signin">Sign In</Link>
            </Button>

            <Button
              asChild
              size="sm"
              className="bg-purple-700 text-white-300 hover:bg-green-100"
            >
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>

        {/* Hero */}
        <div className="mx-auto mt-12 w-full max-w-2xl text-center">
          <span className="inline-flex rounded-full bg-white/20 px-4 py-2 text-xs font-medium sm:text-sm">
            🥦 Fresh Everyday
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
            Fresh Groceries
            <br />
            Delivered to <span className="text-yellow-300">Your Doorstep</span>
          </h1>

          <p className="mt-6 text-base leading-7 text-green-100 sm:text-lg">
            Shop fresh fruits, vegetables, dairy products, snacks and daily
            essentials from trusted local grocery stores with lightning-fast
            delivery.
          </p>
        </div>

        {/* Quote */}
        <div className="mx-auto mt-10 w-full max-w-2xl rounded-2xl border-l-4 border-yellow-300 bg-white/10 p-5 backdrop-blur">
          <p className="text-lg italic sm:text-xl">
            "Healthy food is not an expense, it's an investment."
          </p>

          <p className="mt-3 text-sm italic text-green-100">
            "Fresh ingredients make every meal unforgettable."
          </p>
        </div>

        {/* Features */}
        <div className="mx-auto mt-10 grid w-full max-w-4xl grid-cols-2 gap-4 md:grid-cols-4">
          {features.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl bg-white/10 p-4 text-center backdrop-blur-md transition hover:bg-white/20"
            >
              <div className="text-3xl">{item.icon}</div>

              <h3 className="mt-3 text-sm font-semibold sm:text-base">
                {item.title}
              </h3>

              <p className="mt-2 text-xs text-green-100 sm:text-sm">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-10 text-center text-sm text-green-100">
          🌱 Fresh Products • 🚚 Fast Delivery • ⭐ Trusted Local Shops
        </div>
      </section>
    </main>
  );
}
