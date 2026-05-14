import type { Metadata } from "next";
import { Inter, EB_Garamond } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteStructuredData } from "@/components/structured-data";
import { APPEARANCE_BOOT_SCRIPT } from "@/contexts/AppearanceContext";
import { LOCALE_BOOT_SCRIPT } from "@/contexts/LocaleContext";

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
});

const ebGaramond = EB_Garamond({
    variable: "--font-eb-garamond",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
});

// Root-level fallback metadata. Pages without their own `metadata` export
// (e.g. /academy, /about, /transparency) inherit this — so every public
// surface gets a clean OG + Twitter card by default.
const ROOT_TITLE = "Louis — open-source legal AI";
const ROOT_DESCRIPTION =
    "The developer platform for legal infrastructure. Open-source, sovereign, free — your API key, your data, your stack.";

export const metadata: Metadata = {
    metadataBase: new URL("https://legal.dashable.dev"),
    title: {
        default: ROOT_TITLE,
        template: "%s · Louis",
    },
    description: ROOT_DESCRIPTION,
    applicationName: "Louis",
    // Icons are resolved from the `src/app/icon.svg` + `src/app/favicon.ico`
    // file conventions — no explicit `icons` block needed.
    // OG/Twitter images come from the `src/app/opengraph-image.tsx`
    // convention, which generates a real 1200x630 PNG for every route.
    openGraph: {
        type: "website",
        url: "/",
        siteName: "Louis",
        title: ROOT_TITLE,
        description: ROOT_DESCRIPTION,
    },
    twitter: {
        card: "summary_large_image",
        title: ROOT_TITLE,
        description: ROOT_DESCRIPTION,
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" data-theme="cream" data-font="serif-garamond">
            <head>
                {/* Avoid a flash of the default theme: apply user's stored
                    appearance synchronously before React hydrates. */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: APPEARANCE_BOOT_SCRIPT,
                    }}
                />
                {/* Same for locale: set lang + dir attributes before the
                    React tree paints so RTL layouts don't flash LTR. */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: LOCALE_BOOT_SCRIPT,
                    }}
                />
                {/* Organization + WebSite JSON-LD — applies site-wide. */}
                <SiteStructuredData />
            </head>
            <body
                className={`${inter.variable} ${ebGaramond.variable} font-sans antialiased`}
            >
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
