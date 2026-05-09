export default function Unauthorized() {
  return (
    <div className="h-screen flex items-center justify-center">
      <h1 className="text-xl font-bold text-red-500">
        🚫 You are not allowed to access this page
      </h1>
    </div>
  );
}