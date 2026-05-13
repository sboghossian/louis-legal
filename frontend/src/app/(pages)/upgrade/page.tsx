"use client";

/**
 * /upgrade — there's nothing to upgrade to. Louis is free; users bring
 * their own LLM API key. Redirect to the free-product explainer.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/contexts/LocaleContext";

export default function UpgradeRedirect() {
    const router = useRouter();
    const { t } = useLocale();
    useEffect(() => {
        router.replace("/billing");
    }, [router]);
    return (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {t("upgrade.redirect")}
        </div>
    );
}
