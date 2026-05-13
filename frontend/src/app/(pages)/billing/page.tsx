"use client";

/**
 * Billing is gone — Louis is 100% free. Users bring their own LLM API key,
 * so there is nothing to bill for. This page exists only to gracefully
 * redirect anyone landing on a saved link and explain the change.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Coins, ArrowRight } from "lucide-react";
import { useLocale } from "@/contexts/LocaleContext";

export default function BillingPage() {
    const router = useRouter();
    const { t } = useLocale();

    useEffect(() => {
        const timer = setTimeout(() => router.replace("/settings/api-keys"), 4500);
        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div className="max-w-2xl mx-auto px-6 md:px-10 py-12">
            <div className="rounded-2xl border border-[#e7e2d6] bg-[#fbf8f2] p-8">
                <div className="w-10 h-10 rounded-lg bg-card border border-[#e7e2d6] flex items-center justify-center mb-4">
                    <Coins className="w-4 h-4 text-amber-700" />
                </div>
                <h1 className="text-2xl font-serif mb-2">{t("billing.heading")}</h1>
                <p className="text-foreground/80 leading-relaxed mb-6">
                    {t("billing.body")}
                </p>
                <div className="flex flex-wrap gap-3">
                    <Link
                        href="/settings/api-keys"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-foreground text-white hover:bg-foreground"
                    >
                        {t("billing.manage_keys")}
                        <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                        href="/settings"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-border hover:bg-card"
                    >
                        {t("billing.settings")}
                    </Link>
                </div>
                <p className="mt-6 text-xs text-muted-foreground">
                    {t("billing.redirect")}
                </p>
            </div>
        </div>
    );
}
