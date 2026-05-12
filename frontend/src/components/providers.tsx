"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { AppearanceProvider } from "@/contexts/AppearanceContext";
import { LocaleProvider } from "@/contexts/LocaleContext";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <UserProfileProvider>
                <AppearanceProvider>
                    <LocaleProvider>{children}</LocaleProvider>
                </AppearanceProvider>
            </UserProfileProvider>
        </AuthProvider>
    );
}
