import type { Metadata } from "next";
import { Inter, EB_Garamond } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
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

export const metadata: Metadata = {
    metadataBase: new URL("http://localhost:3000"),
    title: "Louis - AI Legal Platform",
    description:
        "AI-powered legal document analysis and contract review platform.",
    icons: {
        icon: [
            { url: "/icon.svg", type: "image/svg+xml" },
            { url: "/favicon.ico" },
        ],
        apple: "/apple-touch-icon.png",
    },
    openGraph: {
        type: "website",
        url: "http://localhost:3000",
        siteName: "Louis",
        title: "Louis - AI Legal Platform",
        description:
            "AI-powered legal document analysis and contract review platform.",
        images: [
            {
                url: "/link-image.jpg",
                width: 1200,
                height: 651,
                alt: "Louis",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Louis - AI Legal Platform",
        description:
            "AI-powered legal document analysis and contract review platform.",
        images: ["/link-image.jpg"],
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
            </head>
            <body
                className={`${inter.variable} ${ebGaramond.variable} font-sans antialiased`}
            >
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
