"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, ChevronDown } from "lucide-react";

export function UserDropdown({ displayName, email }: { displayName: string, email: string }) {
    const router = useRouter();

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/");
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-muted px-3 py-1.5 rounded-full transition-colors text-sm font-medium outline-none">
                <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                </div>
                <span className="truncate max-w-[120px] hidden sm:inline-block">{displayName}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{displayName}</p>
                        <p className="text-xs leading-none text-muted-foreground">{email}</p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                    onClick={handleLogout} 
                    className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer flex items-center h-10"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    <span className="font-bold">로그아웃</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
