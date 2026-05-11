import { ArrowLeft } from "lucide-react";
import SignUpPage from "./register/page";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function AuthLayout({children}: {children: React.ReactNode}){
    return(
        <div className="min-h-screen flex items-center justify-center">
            <div className="absolute top-5 left-5">
                <Link href='/' className={buttonVariants({variant:'secondary'})} >
                <ArrowLeft className="size-4"/>Back
            </Link>
            </div>
        <div className="w-full max-w-5xl mx-auto">
            {children}
            </div>
        </div>
    )
}