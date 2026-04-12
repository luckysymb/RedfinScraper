import axios from 'axios';
import fs from 'fs';
import {load} from "cheerio";

/** [fipsCode, stateName] — state name is turned into a Redfin URL segment (spaces → hyphens). */
const states = [
    // [174, 'Alabama'],
    // // ['02', 'Alaska'],
    // [286, 'Arizona'],
    // [78, 'Arkansas'],
    // [206, 'Colorado'],
    // [81, 'Connecticut'],
    // [44, 'Delaware'],
    // // ['11', 'District of Columbia'],
    // [959, 'Florida'],
    // [393, 'Georgia'],
    // [21, 'Hawaii'],
    // // ['16', 'Idaho'],
    // [330, 'Illinois'],
    // [188, 'Indiana'],
    // [123, 'Iowa'],
    // // ['20', 'Kansas'],
    // [146, 'Kentucky'],
    // // ['22', 'Louisiana'],
    // [46, 'Maine'],
    // [181, 'Maryland'],
    // [39, 'Massachusetts'],
    // [262, 'Michigan'],
    // [200, 'Minnesota'],
    // // ['28', 'Mississippi'],
    // // ['29', 'Missouri'],
    // // ['30', 'Montana'],
    // [79, 'Nebraska'],
    // [97, 'Nevada'],
    // [33, 'New-Hampshire'],
    // [251, 'New-Jersey'],
    // // ['35', 'New Mexico'],
    [358, 'New-York'],
    [525, 'North-Carolina'],
    // ['38', 'North Dakota'],
    [302, 'Ohio'],
    [163, 'Oklahoma'],
    [129, 'Oregon'],
    [380, 'Pennsylvania'],
    [22, 'Rhode-Island'],
    [307, 'South-Carolina'],
    [31, 'South-Dakota'],
    [316, 'Tennessee'],
    // ['48', 'Texas'],
    // ['49', 'Utah'],
    [19, 'Vermont'],
    [289, 'Virginia'],
    [199, 'Washington'],
    [53, 'West-Virginia'],
    [139, 'Wisconsin'],
    [599, 'California']
    // ['56', 'Wyoming'],
];

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

/**
 * Total result pages from the search chrome, e.g. "Viewing page 1 of 1594"
 * (see `span[data-rf-test-name="download-and-save-page-number-text"]` in Redfin HTML).
 */
function extractTotalPageCount($, html) {
    const pageText =
        $('[data-rf-test-name="download-and-save-page-number-text"]')
            .text()
            .trim() ||
        $(".viewingPage span.pageText").first().text().trim();

    let m = pageText.match(/Viewing\s+page\s+[\d,]+\s+of\s+([\d,]+)/i);
    if (!m && html) {
        m = String(html).match(/Viewing\s+page\s+[\d,]+\s+of\s+([\d,]+)/i);
    }
    if (m) {
        const n = parseInt(m[1].replace(/,/g, ""), 10);
        if (Number.isFinite(n) && n >= 1) return n;
    }
    return 1;
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

const filterPath =
    'filter/property-type=house+townhouse+multifamily/page-';

console.log('Starting to scrape Redfin...');
const outPath = new URL("dataset/redfin_homes_forSale.json", import.meta.url);

const requestHeaders = {
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-encoding": "gzip, deflate, br, zstd",
    "accept-language": "en-US,en;q=0.9",
    cookie: "RF_BID_UPDATED=1; __pdst=d614b385933a44038ccd30d8bcf2cddc; _scor_uid=37894237c47045cab062d322f40014f4; _gid=GA1.2.1811119779.1775874005; g_state={\"i_l\":0,\"i_ll\":1775874002700,\"i_e\":{\"enable_itp_optimization\":0},\"i_et\":1775874002700}; RF_LAST_USER_ACTION=1775874029425%3Aebf47571932e1bbd5cfab4543549c88744e8f3d0; RF_PARTY_ID=106749746; RF_AUTH=0fa4313a678b73cee8c56b9098123f2880b14853; RF_W_AUTH=0fa4313a678b73cee8c56b9098123f2880b14853; RF_SECURE_AUTH=9ba1e9150a3cb68f4420771b171caeca6e17b1d1; RF_ACCESS_LEVEL=2; shared_search_intros=1414098202%3D1775874031123%26dec%3D1775874031123%26ipc%3D1; _gcl_au=1.1.1189148638.1775873992.1732191438.1775874105.1775874104; searchMode=1; SA_FLYOUT_VIEWS=1; RF_LDP_VIEWS_FOR_PROMPT=%7B%22viewsData%22%3A%7B%7D%2C%22expiration%22%3A%222028-04-10T02%3A24%3A17.138Z%22%2C%22totalPromptedLdps%22%3A0%7D; segmentedControlMode=0; save_search_nudge_flyout=1%251775875151397%25false; _clck=cp9kzq%5E2%5Eg54%5E0%5E2292; RF_BROWSER_ID=yK5prHHSRvipfgltBTjsYw; RF_BROWSER_ID_GREAT_FIRST_VISIT_TIMESTAMP=2026-04-10T20%3A29%3A23.312902; RF_BROWSER_CAPABILITIES=%7B%22screen-size%22%3A4%2C%22events-touch%22%3Afalse%2C%22ios-app-store%22%3Afalse%2C%22google-play-store%22%3Afalse%2C%22ios-web-view%22%3Afalse%2C%22android-web-view%22%3Afalse%7D; RF_LAST_ACCESS=1775895510879%3Af0feb68d6ebe813965bee248c07f04bcc8b84023; RF_VISITED=true; RF_BUSINESS_MARKET=71; _gcl_gs=2.1.k1$i1775969387$u256521864; RF_HAS_UTM_CAMPAIGN=; PageCount=1; _gac_UA-294985-1=1.1775969416.EAIaIQobChMIkYzjwcHnkwMV_hCiAx2Wzjx1EAAYASAAEgIWvfD_BwE; _gcl_aw=GCL.1775969438.EAIaIQobChMIkYzjwcHnkwMV_hCiAx2Wzjx1EAAYASAAEgIWvfD_BwE; _gcl_dc=GCL.1775969438.EAIaIQobChMIkYzjwcHnkwMV_hCiAx2Wzjx1EAAYASAAEgIWvfD_BwE; RF_LISTING_VIEWS=209612259.209011617.212943314.212468864.212229808.212888503.213673686.213924037; RF_LAST_DP_SERVICE_REGION=3530; RF_CORVAIR_LAST_VERSION=vLATEST; tatari-session-cookie=fa052518-a523-84d5-394d-6b7e6f162fcb; FEED_COUNT=%5B%221%22%2C%22t%22%5D; audS=t; unifiedLastSearch=name%3DAlabama%26subName%3DUSA%26url%3D%252Fstate%252FAlabama%26id%3D11_1%26type%3D11%26unifiedSearchType%3D11%26isSavedSearch%3D%26countryCode%3DUS; RF_LAST_NAV=0; RF_MARKET=sacramento; OptanonConsent=isGpcEnabled=0&datestamp=Sat+Apr+11+2026+22%3A40%3A13+GMT-0700+(Pacific+Daylight+Time)&version=202512.1.0&browserGpcFlag=0&isIABGlobal=false&hosts=&consentId=3d505129-d21a-4945-8aab-51b514fe30e1&interactionCount=1&isAnonUser=1&landingPath=NotLandingPage&groups=C0001%3A1%2CC0003%3A1%2CSPD_BG%3A1%2CC0002%3A1%2CC0004%3A1&crTime=1775874028668&AwaitingReconsent=false&geolocation=JP%3B13; OptanonAlertBoxClosed=2026-04-12T05:40:13.724Z; tatari-cookie-test=96185559; userPreferences=parcels%3Dtrue%26schools%3Dfalse%26mapStyle%3Ds%26statistics%3Dtrue%26agcTooltip%3Dfalse%26agentReset%3Dfalse%26ldpRegister%3Dfalse%26afCard%3D2%26schoolType%3D0%26lastSeenLdp%3DwithSharedSearchCookie%26viewedSwipeableHomeCardsDate%3D1775972418634; _uetsid=ed6a3510354c11f183a76fa871065dbc|1ojlqiu|2|g55|0|2292; _uetvid=ed6a63c0354c11f1bd43917a74f116be|12xr8uf|1775972423050|13|1|bat.bing.com/p/conversions/c/e; _ga=GA1.2.369503290.1775873993; _ga_928P0PZ00X=GS2.1.s1775971389$o6$g1$t1775972431$j36$l0$h0; aws-waf-token=1ad0583a-47b2-4e90-9712-500f3c532cb9:EwoAypYnHfdPAAAA:iWKa6MsuowjSiz3WGlSrvfTA3UIv69t7QY8o25J2aODa00ehVpq5qgTqsVsJY8XYcKziTMpJWzCQteo7WpB4a5DILXBo3a86DDIzokdOcYaTekDqHVQGkQHLya2m7ed1NjNWYzZX9KKO15i/Pm/em6bAmnuhKSiuFf9yejmySAI46OyORP3lcVJet3V9I62Y8uFvnwrECXQ9DTnEA1niZTYxmLtBpS0TUwbByMhOaHGWDVVJa78x3R6V/pJqCmhvOXcq/gnO2WSSxQ==; _dd_s=rum=2&id=f8374143-9741-4d73-9da6-d8147e8ad8dc&created=1775971266284&expire=1775973438589",
    priority: "u=0, i",
    "sec-ch-ua":
        '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "none",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1",
    "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
};

for (const state of states) {
    const pageUrlFor = (n) =>
        `https://www.redfin.com/state/${state[1]}/${filterPath}${n}`;
    const firstPageUrl = pageUrlFor(1);
    let totalPages = 1;
    let firstPageHtml = null;

    try {
        const firstRes = await axios.get(firstPageUrl, { headers: requestHeaders });
        firstPageHtml = firstRes.data;
        const $0 = load(firstPageHtml);
        totalPages = extractTotalPageCount($0, firstPageHtml);
        console.log(`${state[1]}: ${totalPages} page(s) (from search chrome)`);
    } catch (error) {
        console.error(`${state[1]} first page:`, error.message);
        continue;
    }

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const pageUrl = pageUrlFor(pageNum);
        console.log(`Scraping ${pageUrl}`);

        try {
            const html =
                pageNum === 1 && firstPageHtml != null
                    ? firstPageHtml
                    : (await axios.get(pageUrl, { headers: requestHeaders })).data;
            if (pageNum === 1) firstPageHtml = null;
            const $ = load(html);
            const homes = [];
            const seenIds = new Set();

            $('script[type="application/ld+json"]').each((_, el) => {
                const raw = $(el).html();
                // if (!raw?.includes("SingleFamilyResidence")) return;

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

            fs.appendFileSync(
                outPath,
                JSON.stringify(homes, null, 2) + "\n",
                "utf8",
            );

            console.log(
                `Extracted ${state[1]} page ${pageNum}/${totalPages} — ${homes.length} homes → ${outPath.pathname}`,
            );
        } catch (error) {
            console.error(`${state[1]} page ${pageNum}:`, error.message);
        }
    }
}
