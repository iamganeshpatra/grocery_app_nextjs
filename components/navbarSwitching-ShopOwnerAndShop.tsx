"use client";

import { usePathname } from "next/navigation";

import ShopOwnerNavbar from "@/components/shop-owner-navbar";
import ShopNavbar from "@/components/shop-navbar";

const NavbarSwitcher = () => {
  const pathname = usePathname();

  const isShopOwnerPage = pathname.startsWith("/shop-owner");

  const isShopPage = pathname.startsWith("/shop/");

  const shopId = pathname.split("/")[2];

  return (
    <>
      {isShopOwnerPage && <ShopOwnerNavbar />}

      {isShopPage && <ShopNavbar shopId={shopId} />}
    </>
  );
};

export default NavbarSwitcher;
