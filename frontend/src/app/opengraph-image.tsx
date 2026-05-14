import { ImageResponse } from "next/og";

/**
 * Site-wide Open Graph / Twitter card — generated as a real 1200x630 PNG.
 *
 * Replaces the old `public/og-image.svg`: social crawlers (X, LinkedIn,
 * Slack, iMessage, Discord) don't rasterise SVG, so the previous card
 * rendered blank everywhere. This file convention is inherited by every
 * route, so a page only needs its own `opengraph-image` if it wants a
 * bespoke card.
 */

export const alt = "Louis — the developer platform for legal infrastructure";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    height: "100%",
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    backgroundColor: "#fbf8f2",
                    backgroundImage:
                        "radial-gradient(circle at 85% 15%, rgba(201,169,97,0.22), transparent 55%)",
                    padding: "76px",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                    }}
                >
                    <div
                        style={{
                            width: "32px",
                            height: "2px",
                            backgroundColor: "#b45309",
                        }}
                    />
                    <div
                        style={{
                            fontSize: "26px",
                            letterSpacing: "7px",
                            color: "#b45309",
                        }}
                    >
                        SOVEREIGN · OPEN SOURCE · FREE FOREVER
                    </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                    <div
                        style={{
                            fontSize: "118px",
                            color: "#1a1a1a",
                            lineHeight: 1,
                        }}
                    >
                        Louis
                    </div>
                    <div
                        style={{
                            fontSize: "54px",
                            color: "#3f3f3f",
                            marginTop: "28px",
                            maxWidth: "920px",
                            lineHeight: 1.18,
                        }}
                    >
                        The developer platform for legal infrastructure.
                    </div>
                </div>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "20px",
                        fontSize: "30px",
                        color: "#6b6b6b",
                    }}
                >
                    <span>983 skills</span>
                    <span style={{ color: "#cbb994" }}>·</span>
                    <span>30+ jurisdictions</span>
                    <span style={{ color: "#cbb994" }}>·</span>
                    <span>MIT licensed</span>
                </div>
            </div>
        ),
        { ...size },
    );
}
