/**
 * JSON-LD structured data.
 *
 * `<SiteStructuredData />` is rendered once in the root layout — it emits
 * the Organization + WebSite graph that applies to every page.
 * `<SoftwareApplicationData />` is rendered on the marketing landing page
 * only, describing Louis itself as a free, open-source application.
 *
 * Search engines use these to build rich results and the knowledge panel;
 * they're plain `<script>` tags so they cost nothing at runtime.
 */

const SITE_URL = "https://legal.dashable.dev";
const REPO_URL = "https://github.com/sboghossian/louis-legal";
const DESCRIPTION =
    "The open-source developer platform for legal infrastructure. Build legal AI inside your own perimeter — your API key, your data, your stack. 983 skills, 30+ jurisdictions, MIT licensed.";

function JsonLd({ data }: { data: Record<string, unknown> }) {
    return (
        <script
            type="application/ld+json"
            // The payload is a static, code-defined object — no user input.
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
    );
}

export function SiteStructuredData() {
    const data = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "Organization",
                "@id": `${SITE_URL}/#organization`,
                name: "Louis",
                url: SITE_URL,
                logo: `${SITE_URL}/icon.svg`,
                description: DESCRIPTION,
                sameAs: [REPO_URL],
            },
            {
                "@type": "WebSite",
                "@id": `${SITE_URL}/#website`,
                url: SITE_URL,
                name: "Louis",
                description: DESCRIPTION,
                inLanguage: "en",
                publisher: { "@id": `${SITE_URL}/#organization` },
            },
        ],
    };
    return <JsonLd data={data} />;
}

export function SoftwareApplicationData() {
    const data = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Louis",
        url: SITE_URL,
        description: DESCRIPTION,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, Self-hosted",
        softwareHelp: `${SITE_URL}/academy`,
        license: "https://opensource.org/licenses/MIT",
        isAccessibleForFree: true,
        offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
        },
        publisher: { "@id": `${SITE_URL}/#organization` },
    };
    return <JsonLd data={data} />;
}
