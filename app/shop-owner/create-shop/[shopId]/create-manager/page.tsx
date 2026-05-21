"use client"

import { completeShopManagerSignup } from "@/actions/account.actions";
import { signUp } from "@/lib/auth-client";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react"

const ShopManagerSignUp=()=>{

    const router=useRouter()
    const params=useParams()
    const shopId=params.shopId as string

    const [name,setName]=useState("")
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleShopManager=async()=>{
        const res=await signUp.email({
            email,
            password,
            name
        })
        if(!res.data?.user?.id)return
        await completeShopManagerSignup(res.data.user.id,shopId)
        router.push(`/shop-owner/create-shop/${shopId}`);
    }

    return (
      <>
        <h2>Shop-Manager SignUp</h2>
        <input placeholder="name" type="text" value={name} onChange={(e)=>setName(e.target.value)} />
        <input placeholder="email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input placeholder="password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <button onClick={handleShopManager}>
            Create Manager
        </button>
      </>
    );
}
export default ShopManagerSignUp