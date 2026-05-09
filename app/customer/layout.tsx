import CustomerNavbar from "@/customerNavbar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
    > 
      <CustomerNavbar/>
      <div className="min-h-full flex flex-col">{children}</div>
      
    </div>
  );
}