"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { AppearanceProvider } from "@/contexts/AppearanceContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <UserProfileProvider>
                <AppearanceProvider>{children}</AppearanceProvider>
            </UserProfileProvider>
        </AuthProvider>
    );
}
