"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import { UserProfileProvider } from "@/contexts/UserProfileContext";
import { AppearanceProvider } from "@/contexts/AppearanceContext";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ConfirmDialogProvider } from "@/app/contexts/ConfirmDialog";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <UserProfileProvider>
                <AppearanceProvider>
                    <LocaleProvider>
                        <ToastProvider>
                            <ConfirmDialogProvider>
                                {children}
                            </ConfirmDialogProvider>
                        </ToastProvider>
                    </LocaleProvider>
                </AppearanceProvider>
            </UserProfileProvider>
        </AuthProvider>
    );
}
