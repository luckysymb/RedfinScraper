import { load } from "cheerio";
import fs from "fs";

const htmlPath = new URL("dataset/redfin_response.html", import.meta.url);
const html = fs.readFileSync(htmlPath, "utf8");
const $ = load(html);

/** Schema.org types used on Redfin home cards (often SingleFamilyResidence even for townhomes). */
const RESIDENCE_TYPES = new Set([
    "SingleFamilyResidence",
    "Townhouse",
    "Apartment",
    "Condo",
]);

function homeIdFromUrl(url) {
    if (!url) return null;
    const m = String(url).match(/\/home\/(\d+)/);
    return m ? m[1] : null;
}

/**
 * Each listing is a two-element array: [SingleFamilyResidence|..., Product with Offer].
 */
function mergeLdJsonListing(items) {
    if (!Array.isArray(items) || items.length < 2) return null;
    const residence = items.find((x) => x && RESIDENCE_TYPES.has(x["@type"]));
    const product = items.find((x) => x && x["@type"] === "Product");
    if (!residence || !product) return null;

    const addr = residence.address || {};
    const offer = product.offers || {};
    const geo = residence.geo || {};
    const floor = residence.floorSize || {};
    const url = residence.url || product.url;

    return {
        id: homeIdFromUrl(url),
        url,
        displayName: residence.name,
        streetAddress: addr.streetAddress ?? null,
        city: addr.addressLocality ?? null,
        state: addr.addressRegion ?? null,
        postalCode: addr.postalCode ?? null,
        country: addr.addressCountry ?? null,
        latitude: geo.latitude ?? null,
        longitude: geo.longitude ?? null,
        beds: residence.numberOfRooms ?? null,
        sqft: floor.value != null ? Number(floor.value) : null,
        price:
            offer.price != null && offer.price !== ""
                ? Number(offer.price)
                : null,
        priceCurrency: offer.priceCurrency ?? null,
        schemaPropertyType: residence["@type"],
    };
}

function enrichFromHomeCard($card, row) {
    if (!$card.length) return row;
    const bathsText = $card.find(".bp-Homecard__Stats--baths").text().trim();
    const bathsMatch = bathsText.match(/(\d+(?:\.\d+)?)/);
    row.baths = bathsMatch ? Number(bathsMatch[1]) : null;

    const sash = $card
        .find('[data-rf-test-id="home-sash"]')
        .first()
        .text()
        .trim();
    row.listingSash = sash || null;

    const priceDisplayed = $card
        .find(".bp-Homecard__Price--value")
        .first()
        .text()
        .trim();
    row.priceDisplay = priceDisplayed || null;

    return row;
}

const homes = [];
const seenIds = new Set();

$('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html();
    if (!raw?.includes("SingleFamilyResidence")) return;

    let data;
    try {
        data = JSON.parse(raw.trim());
    } catch {
        return;
    }

    const row = mergeLdJsonListing(data);
    if (!row?.id) return;
    if (seenIds.has(row.id)) return;
    seenIds.add(row.id);

    const $card = $(el).closest(".bp-Homecard");
    homes.push(enrichFromHomeCard($card, row));
});

const outPath = new URL("dataset/redfin_homes.json", import.meta.url);
fs.writeFileSync(outPath, JSON.stringify(homes, null, 2), "utf8");

console.log(`Extracted ${homes.length} homes → dataset/redfin_homes.json`);
for (const h of homes.slice(0, 3)) {
    console.log("—", h.displayName, h.price != null ? `$${h.price}` : "", h.url);
}
