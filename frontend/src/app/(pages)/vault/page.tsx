"use client";

/**
 * Vault — landing page for the encrypted-storage feature.
 *
 * As of the E2EE upgrade, this page also owns the *gate* into the vault:
 *   - first-time users see <PassphraseSetupModal>
 *   - returning users with a missing in-memory KEK see <PassphraseUnlockModal>
 *   - unlocked users see the explainer + entry points + settings panel
 *
 * The actual document surface still lives under /projects; this page is
 * the front door. Document upload/read happens in the projects flow,
 * which can now import from `@/app/components/vault` for the E2EE helpers.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Lock,
    ShieldCheck,
    History,
    KeyRound,
    ArrowRight,
    FolderOpen,
    Settings as SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

import { useLocale } from "@/contexts/LocaleContext";
import {
    VaultKeyProvider,
    useVaultKey,
} from "@/contexts/VaultKeyContext";
import { PassphraseSetupModal } from "@/app/components/vault/PassphraseSetupModal";
import { PassphraseUnlockModal } from "@/app/components/vault/PassphraseUnlockModal";
import { VaultSettingsPanel } from "@/app/components/vault/VaultSettingsPanel";
import { EncryptionStatusBar } from "@/app/components/vault/EncryptionStatusBar";

export default function VaultPage() {
    return (
        <VaultKeyProvider>
            <VaultPageInner />
        </VaultKeyProvider>
    );
}

function VaultPageInner() {
    const { t } = useLocale();
    const router = useRouter();
    const { isSetup, isUnlocked, saltB64, completeSetup, unlock } =
        useVaultKey();

    const [showSettings, setShowSettings] = useState(false);
    // Allow the user to dismiss either modal explicitly (X / Cancel) without
    // immediately popping it again on the next render. We track that the
    // user has dismissed; the gate is otherwise derived directly from the
    // context state (no setState-in-effect mirroring).
    const [setupDismissed, setSetupDismissed] = useState(false);
    const [unlockDismissed, setUnlockDismissed] = useState(false);

    const setupOpen = !isSetup && !setupDismissed;
    const unlockOpen = isSetup && !isUnlocked && !unlockDismissed;

    return (
        <div className="max-w-3xl mx-auto px-8 py-10">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-amber-700" />
                    <h1 className="text-2xl font-serif font-semibold tracking-tight">
                        {t("vault.title")}
                    </h1>
                </div>
                {isUnlocked && (
                    <button
                        type="button"
                        onClick={() => setShowSettings((v) => !v)}
                        className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900"
                    >
                        <SettingsIcon className="w-3.5 h-3.5" />
                        {showSettings ? t("vault.settings.toggle.hide") : t("vault.settings.toggle.show")}
                    </button>
                )}
            </div>

            <p className="text-sm text-gray-600 font-serif max-w-2xl mb-6">
                {t("vault.intro")}
            </p>

            {isUnlocked && (
                <div className="mb-6">
                    <EncryptionStatusBar />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                <Feature
                    icon={KeyRound}
                    title={t("vault.feature.aes.title")}
                    desc={t("vault.feature.aes.desc")}
                />
                <Feature
                    icon={ShieldCheck}
                    title={t("vault.feature.routing.title")}
                    desc={t("vault.feature.routing.desc")}
                />
                <Feature
                    icon={History}
                    title={t("vault.feature.audit.title")}
                    desc={t("vault.feature.audit.desc")}
                />
                <Feature
                    icon={Lock}
                    title={t("vault.feature.key.title")}
                    desc={t("vault.feature.key.desc")}
                />
            </div>

            {showSettings && isUnlocked && (
                <div className="mb-8">
                    <VaultSettingsPanel />
                </div>
            )}

            <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                <h2 className="font-medium text-sm mb-2">{t("vault.next.title")}</h2>
                <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                        <Link
                            href="/customize"
                            className="text-blue-600 hover:underline"
                        >
                            {t("vault.next.customize")}
                        </Link>
                    </li>
                    <li className="flex items-center gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                        <Link
                            href="/projects"
                            className="text-blue-600 hover:underline"
                        >
                            {t("vault.next.projects")}
                        </Link>
                    </li>
                    <li className="flex items-center gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                        <Link
                            href="/docs#vault"
                            className="text-blue-600 hover:underline"
                        >
                            {t("vault.next.docs")}
                        </Link>
                    </li>
                </ul>
            </div>

            <div className="mt-8 flex gap-3">
                <Button onClick={() => router.push("/projects")}>
                    <FolderOpen className="w-3.5 h-3.5 mr-1" />
                    {t("vault.cta.projects")}
                </Button>
                <Button
                    variant="outline"
                    onClick={() => router.push("/customize")}
                >
                    {t("vault.cta.configure")}
                </Button>
            </div>

            <PassphraseSetupModal
                open={setupOpen}
                onCancel={() => setSetupDismissed(true)}
                onComplete={async ({ salt, kek }) => {
                    // TODO(server): POST the salt + recoverySalt + a wrapped-
                    // KEK envelope so the user can recover from another
                    // device. See docs/VAULT_ENCRYPTION.md.
                    completeSetup(salt, kek);
                }}
            />

            <PassphraseUnlockModal
                open={unlockOpen}
                saltB64={saltB64 ?? ""}
                onCancel={() => setUnlockDismissed(true)}
                onUnlocked={async ({ kek }) => {
                    unlock(kek);
                }}
            />
        </div>
    );
}

function Feature({
    icon: Icon,
    title,
    desc,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    desc: string;
}) {
    return (
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-amber-700" />
                <span className="font-medium text-sm">{title}</span>
            </div>
            <p className="text-xs text-gray-600 font-serif leading-relaxed">
                {desc}
            </p>
        </div>
    );
}
