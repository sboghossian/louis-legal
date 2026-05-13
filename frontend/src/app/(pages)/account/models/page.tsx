"use client";

/**
 * /account/models is collapsed into /settings/api-keys (decision #67 +
 * audit 1B): both pages were configuring the same BYO-LLM key surface
 * from different angles, with conflicting UIs and conflicting backends.
 * Settings/api-keys is now canonical — model preference + 14-provider
 * keys live there. This route exists only to keep deep-links working.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ModelsAndApiKeysRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/settings/api-keys");
    }, [router]);
    return null;
}
