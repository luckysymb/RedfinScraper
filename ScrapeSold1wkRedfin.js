import axios from 'axios';
import fs from 'fs';
import {load} from "cheerio";

/** [fipsCode, stateName] — state name is turned into a Redfin URL segment (spaces → hyphens). */
const states = [
    [19, 'Alabama'],
    // ['02', 'Alaska'],
    [43, 'Arizona'],
    [11, 'Arkansas'],
    [30, 'Colorado'],
    [8, 'Connecticut'],
    [4, 'Delaware'],
    [96, 'Florida'],
    [23, 'Georgia'],
    [4, 'Hawaii'],
    // ['16', 'Idaho'],
    [35, 'Illinois'],
    [29, 'Indiana'],
    [11, 'Iowa'],
    // ['20', 'Kansas'],
    [13, 'Kentucky'],
    // ['22', 'Louisiana'],
    [5, 'Maine'],
    [18, 'Maryland'],
    [10, 'Massachusetts'],
    [27, 'Michigan'],
    [18, 'Minnesota'],
    // ['28', 'Mississippi'],
    // ['29', 'Missouri'],
    // ['30', 'Montana'],
    [6, 'Nebraska'],
    [15, 'Nevada'],
    [3, 'New-Hampshire'],
    [16, 'New-Jersey'],
    // ['35', 'New Mexico'],
    [20, 'New-York'],
    [51, 'North-Carolina'],
    // ['38', 'North Dakota'],
    [37, 'Ohio'],
    [16, 'Oklahoma'],
    [15, 'Oregon'],
    [32, 'Pennsylvania'],
    [2, 'Rhode-Island'],
    [20, 'South-Carolina'],
    [3, 'South-Dakota'],
    [30, 'Tennessee'],
    // ['48', 'Texas'],
    // ['49', 'Utah'],
    [2, 'Vermont'],
    [30, 'Virginia'],
    [26, 'Washington'],
    [5, 'West-Virginia'],
    [17, 'Wisconsin'],
    [91, 'California']
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

/** Parse a Redfin-style price string (e.g. "$439,000") for numeric fields. */
function parsePriceDisplay(text) {
    const cleaned = String(text).replace(/[$,\s]/g, "");
    if (!cleaned) return null;
    const m = cleaned.match(/^\d+(?:\.\d+)?/);
    if (!m) return null;
    const n = Number(m[0]);
    return Number.isFinite(n) ? n : null;
}

/**
 * For-sale cards: [SingleFamilyResidence|..., Product with Offer].
 * Sold / some SERP cards: single SingleFamilyResidence object (no Product; price on the card only).
 */
function mergeLdJsonListing(data) {
    let residence;
    let offer = null;
    let urlFromProduct = null;

    if (Array.isArray(data)) {
        if (data.length < 2) return null;
        residence = data.find((x) => x && RESIDENCE_TYPES.has(x["@type"]));
        const product = data.find((x) => x && x["@type"] === "Product");
        if (!residence || !product) return null;
        offer = product.offers || {};
        urlFromProduct = product.url;
    } else if (data && typeof data === "object" && RESIDENCE_TYPES.has(data["@type"])) {
        residence = data;
    } else {
        return null;
    }

    const addr = residence.address || {};
    const geo = residence.geo || {};
    const floor = residence.floorSize || {};
    const url = residence.url || urlFromProduct;

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
            offer &&
            offer.price != null &&
            offer.price !== ""
                ? Number(offer.price)
                : null,
        priceCurrency: offer?.priceCurrency ?? null,
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

    if (row.price == null && priceDisplayed) {
        const parsed = parsePriceDisplay(priceDisplayed);
        if (parsed != null) {
            row.price = parsed;
            if (!row.priceCurrency && /\$/.test(priceDisplayed)) {
                row.priceCurrency = "USD";
            }
        }
    }

    return row;
}

const filterPath =
    'filter/property-type=house+townhouse+multifamily,include=sold-1wk/page-';

console.log('Starting to scrape Redfin...');
for (const state of states) {
    for (let pageNum = 1; pageNum <= state[0]; pageNum++) {
        const url = `https://www.redfin.com/state/${state[1]}/${filterPath}${pageNum}`;
        console.log(`Scraping ${url}`);
        await axios.get(url, {
            headers: {
                "accept":'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                "accept-encoding":'gzip, deflate, br, zstd',
                "accept-language":'en-US,en;q=0.9',
                "cookie":'audS=t; RF_BROWSER_ID=esxTpg7CRSOxEvpgfL5J9A; RF_BROWSER_ID_GREAT_FIRST_VISIT_TIMESTAMP=2026-04-10T16%3A57%3A34.417391; RF_BID_UPDATED=1; __pdst=c714383e96b44a969a88510f6e49c9b0; _scor_uid=3623643a3b184d79b734c547f5a66efe; OTGPPConsent=DBABBg~BUoAAAKA.QA; OptanonAlertBoxClosed=2026-04-10T23:57:52.790Z; _gid=GA1.2.651256491.1775865477; RF_BROWSER_CAPABILITIES=%7B%22screen-size%22%3A4%2C%22events-touch%22%3Afalse%2C%22ios-app-store%22%3Afalse%2C%22google-play-store%22%3Afalse%2C%22ios-web-view%22%3Afalse%2C%22android-web-view%22%3Afalse%7D; _gcl_au=1.1.1978695341.1775865463.453210827.1775867755.1775867755; RF_LAST_USER_ACTION=1775867755621%3A4763ef3fd846a691cf3e3ed7a2a459f2edf885f0; RF_PARTY_ID=106747000; RF_AUTH=e259aff3ccc0f840658f84ec2db780dd0778cb17; RF_W_AUTH=e259aff3ccc0f840658f84ec2db780dd0778cb17; RF_SECURE_AUTH=a646888b1195a2cf00d924941cea73ec1fad3dc4; RF_ACCESS_LEVEL=2; shared_search_intros=1414098202%3D1775867759857%26dec%3D1775867759857%26ipc%3D1; searchMode=1; RF_LAST_ACCESS=1775874191843%3Af6af496f0c8420d332f53fda3f64800ffe55de38; cw-test-20250625_prebid-v2-test_1_99=test; cw-test-00000000_ppid-hem_10_90=control; cw-test-20250807_uid-2-test_95_2.5_2.5=enabled@sha256_absent; cw-test-20250415_req-v9_10_90=control; cw-test-00000000_stand-alone-floors-facade-hardFloor_25_25_25_25=fallb; cw-test-00000000_stand-alone-floors-facade-multiplier_10_80_10_0=multa; cw-test-20250609_floormachine-test_50_50=test; cw-test-20250529_viewable-refresh_5_95=control; cw-test-20250220_viewability-test_100_0=test; cw-test-00000000_stand-alone-floors-comparison-multiplier_0_100=control; _lr_env_src_ats=false; RF_LDP_VIEWS_FOR_PROMPT=%7B%22viewsData%22%3A%7B%7D%2C%22expiration%22%3A%222028-04-10T09%3A36%3A01.448Z%22%2C%22totalPromptedLdps%22%3A0%7D; RF_VISITED=true; _ga_928P0PZ00X=deleted; FEED_TIMESTAMP=1775922251154; RF_LAST_NAV=0; save_search_nudge_flyout=1%251775922357651%25false; segmentedControlMode=0; tatari-session-cookie=704df324-d8dc-643b-919e-991f25bec234; RF_CORVAIR_LAST_VERSION=vLATEST; RF_BUSINESS_MARKET=61; RF_LISTING_VIEWS=212796743.212842279.213126576.211085954.192728535.212622356.208863199.210732563.212405328.212788916.212216869.213326843.212220717.164554134; RF_LAST_DP_SERVICE_REGION=3403; RF_TRAFFIC_SEGMENT=non-organic; OptanonConsent=isGpcEnabled=0&datestamp=Sun+Apr+12+2026+01%3A30%3A56+GMT%2B0900+(Japan+Standard+Time)&version=202512.1.0&browserGpcFlag=0&isIABGlobal=false&hosts=&consentId=27bb264f-328a-4fcc-9343-31a270e4ec04&interactionCount=2&isAnonUser=1&landingPath=NotLandingPage&GPPCookiesCount=1&gppSid=8&groups=C0001%3A1%2CC0003%3A1%2CSPD_BG%3A1%2CC0002%3A1%2CC0004%3A1&intType=6&crTime=1775865474552&geolocation=US%3BCA&AwaitingReconsent=false; _ga_928P0PZ00X=GS2.1.s1775921559$o6$g1$t1775925058$j60$l0$h0; _uetsid=122b39f0353911f1b69c856504ef9ad9|1vvtt9g|2|g54|0|2291; tatari-cookie-test=71957076; t-ip=1; AMP_TOKEN=%24ERROR; _ga=GA1.2.1767093377.1775865465; _dc_gtm_UA-294985-1=1; userPreferences=parcels%3Dtrue%26schools%3Dfalse%26mapStyle%3Ds%26statistics%3Dtrue%26agcTooltip%3Dfalse%26agentReset%3Dfalse%26ldpRegister%3Dfalse%26afCard%3D2%26schoolType%3D0%26lastSeenLdp%3DwithSharedSearchCookie%26viewedSwipeableHomeCardsDate%3D1775925070791; RF_MARKET=phoenix; _uetvid=122b44e0353911f1af56f10adb720135|1cdgcd2|1775925071205|59|1|bat.bing.com/p/conversions/c/e; FEED_COUNT=%5B%221%22%2C%22t%22%5D; aws-waf-token=1ad0583a-47b2-4e90-9712-500f3c532cb9:EwoAnZhy0E1SAAAA:tawYcAbNf3yUko6AjZdFbQUD3COFgS3s+eQ8VUEwv43iYGtBNN80FJbM+vtZWSgX6K2BOZX6e6hESMKjZd+hDBXrvmtONgoDNwlSeb4N5m71rozuMabpEtNxx09ov0O14dzyNUt0mHYUW+e4RffuPcXcep62BcS15hs9aTsWB5EKMP2GC7JueinFtOAOXZ9KyMOW1BEAR79Jwtrl3pRWe8ebnQJZo5I993N+HlQ+O7yWXs0o2IX0JTDm4ZebFDyp1w==; _dd_s=rum=2&id=a4bd53f8-15d2-480f-bb08-3e5b552e90e9&created=1775921575325&expire=1775925979000',
                "priority":'u=0, i',
                "sec-ch-ua":'"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
                "sec-ch-ua-mobile":'?0',
                'sec-ch-ua-platform':'"Windows"',
                'sec-fetch-dest':'document',
                'sec-fetch-mode':'navigate',
                'sec-fetch-site':'none',
                'sec-fetch-user':'?1',
                'upgrade-insecure-requests':'1',
                'user-agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
            }
        })
        .then((response) => {
            // console.log('Response:', response.data);
            const html = response.data;
            const $ = load(html);
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

            const outPath = new URL("dataset/redfin_homes_sold.json", import.meta.url);
            fs.appendFileSync(outPath, JSON.stringify(homes, null, 2) + "\n", "utf8");

            console.log(
                `Extracted ${state[1]} - ${pageNum} - ${homes.length} homes → dataset/redfin_homes_sold.json`,
            );
        })
        .catch((error) => {
            console.error('Error:', error.message);
        });
    }
}
