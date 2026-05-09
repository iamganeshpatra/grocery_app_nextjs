import ManagerNavbar from "@/managerNavbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
    > 
       <ManagerNavbar  />

      <div className="min-h-full flex flex-col">{children}</div>
    </div>
  );
}