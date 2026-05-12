"use client";

/**
 * /upgrade is an alias for /billing — the upgrade flow lives there. We
 * redirect rather than duplicating the page so the upgrade affordance has a
 * memorable URL.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UpgradeRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/billing?tab=upgrade");
    }, [router]);
    return (
        <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Redirecting to upgrade…
        </div>
    );
}
