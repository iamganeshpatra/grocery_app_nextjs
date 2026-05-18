import CustomerNavbar from "@/customerNavbar";
import ManagerNavbar from "@/managerNavbar";
import Image from "next/image";
import SignInPage from "./signin/page";
import SelectUserTypePage from "@/components/homePage";

export default function Home() {
  return (
    <>
      <SelectUserTypePage/>
    </>
  );
}
