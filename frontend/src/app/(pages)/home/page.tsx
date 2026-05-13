"use client";

/**
 * /home is now an alias for /assistant. The assistant entry view holds
 * both the composer AND the dashboard widgets (recent chats, projects,
 * library shortcuts), so there's no reason to maintain two surfaces.
 *
 * Old URLs + the sidebar's "Home" pin from previous sessions still
 * resolve here and bounce to /assistant in one paint.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";

export default function HomeRedirect() {
    const router = useRouter();
    const { t } = useLocale();
    useEffect(() => {
        router.replace("/assistant");
    }, [router]);
    return (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {t("action.opening")}
        </div>
    );
}
