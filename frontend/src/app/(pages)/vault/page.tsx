"use client";

/**
 * Vault — landing page for the encrypted-storage feature.
 *
 * The Vault toggle set lives in /customize → "Vault". The actual document
 * surface is /projects (projects act as vault containers; toggling
 * `vault.encrypted-store` enables per-document AES at rest). This page is
 * the explainer + entry point so the URL "/vault" resolves to something
 * meaningful instead of 404.
 */

import { useRouter } from "next/navigation";
import {
    Lock,
    ShieldCheck,
    History,
    KeyRound,
    ArrowRight,
    FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function VaultPage() {
    const router = useRouter();

    return (
        <div className="max-w-3xl mx-auto px-8 py-10">
            <div className="flex items-center gap-2 mb-2">
                <Lock className="w-5 h-5 text-amber-700" />
                <h1 className="text-2xl font-serif font-semibold tracking-tight">
                    Vault
                </h1>
            </div>
            <p className="text-sm text-gray-600 font-serif max-w-2xl mb-8">
                The Vault is where privileged documents live. Each Vault
                document is encrypted at rest with an AES key derived from
                your account secret, hidden from the skill router by default,
                and access-logged. Projects can be marked "Vault projects" so
                everything inside inherits the protections.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                <Feature
                    icon={KeyRound}
                    title="AES-256 at rest"
                    desc="Vault documents are encrypted before storage. Even a stolen R2 backup yields ciphertext."
                />
                <Feature
                    icon={ShieldCheck}
                    title="Privilege-aware routing"
                    desc="The skill router won't include Vault documents in any chat unless you explicitly opt in for that matter."
                />
                <Feature
                    icon={History}
                    title="Audit log per read"
                    desc="Every access to a Vault document is logged with the user, time, and which chat opened it."
                />
                <Feature
                    icon={Lock}
                    title="Per-client isolation"
                    desc="Conflict-of-interest checks block cross-client matter access without an explicit override."
                />
            </div>

            <div className="border border-gray-200 rounded-lg p-5 bg-gray-50">
                <h2 className="font-medium text-sm mb-2">Where to go next</h2>
                <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                        <Link
                            href="/customize"
                            className="text-blue-600 hover:underline"
                        >
                            Turn on Vault toggles in /customize → Vault
                        </Link>
                    </li>
                    <li className="flex items-center gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                        <Link
                            href="/projects"
                            className="text-blue-600 hover:underline"
                        >
                            Open Projects — mark one as a Vault project to
                            apply protections to every file inside
                        </Link>
                    </li>
                    <li className="flex items-center gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                        <Link
                            href="/docs#vault"
                            className="text-blue-600 hover:underline"
                        >
                            Read the technical details in /docs → Vault
                        </Link>
                    </li>
                </ul>
            </div>

            <div className="mt-8 flex gap-3">
                <Button onClick={() => router.push("/projects")}>
                    <FolderOpen className="w-3.5 h-3.5 mr-1" />
                    Open Projects
                </Button>
                <Button
                    variant="outline"
                    onClick={() => router.push("/customize")}
                >
                    Configure Vault
                </Button>
            </div>
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
