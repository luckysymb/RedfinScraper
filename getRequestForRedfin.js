import axios from 'axios';
import fs from 'fs';
import {load} from "cheerio";

/** [fipsCode, stateName] — state name is turned into a Redfin URL segment (spaces → hyphens). */
const states = [
    [174, 'Alabama'],
    // ['02', 'Alaska'],
    [286, 'Arizona'],
    [78, 'Arkansas'],
    [206, 'Colorado'],
    [81, 'Connecticut'],
    [44, 'Delaware'],
    // ['11', 'District of Columbia'],
    [959, 'Florida'],
    [393, 'Georgia'],
    [21, 'Hawaii'],
    // ['16', 'Idaho'],
    [330, 'Illinois'],
    [188, 'Indiana'],
    [123, 'Iowa'],
    // ['20', 'Kansas'],
    [146, 'Kentucky'],
    // ['22', 'Louisiana'],
    [46, 'Maine'],
    [181, 'Maryland'],
    [39, 'Massachusetts'],
    [262, 'Michigan'],
    [200, 'Minnesota'],
    // ['28', 'Mississippi'],
    // ['29', 'Missouri'],
    // ['30', 'Montana'],
    [79, 'Nebraska'],
    [97, 'Nevada'],
    [33, 'New-Hampshire'],
    [251, 'New-Jersey'],
    // ['35', 'New Mexico'],
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
    'filter/property-type=house+townhouse,status=contingent+pending/page-';

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
                "cookie":'RF_BROWSER_ID=gYnYEjTYT72cMmfNj8X-Ug; RF_BROWSER_ID_GREAT_FIRST_VISIT_TIMESTAMP=2026-04-10T16%3A46%3A36.669495; RF_BID_UPDATED=1; __pdst=29527e7f078d438aa169033bebbe0626; _gid=GA1.2.1673832900.1775864820; _scor_uid=c9bb42bd71314b83b615889ecfa44b01; OTGPPConsent=DBABBg~BUoAAAKA.QA; tatari-session-cookie=80a9fc9f-1eb6-8776-417f-957a7e439392; RF_VISITED=true; searchMode=1; RF_LAST_NAV=0; g_state={"i_l":0,"i_ll":1775864968427,"i_b":"v/HYDSAvdHTqDpfJ6N/yvkPUXvzSMMGJXNfAl+HOFF0","i_e":{"enable_itp_optimization":0},"i_et":1775864968427}; cw-test-20250625_prebid-v2-test_1_99=control; cw-test-00000000_ppid-hem_10_90=control; cw-test-20250807_uid-2-test_95_2.5_2.5=enabled@sha256_absent; cw-test-20250415_req-v9_10_90=control; cw-test-00000000_stand-alone-floors-facade-hardFloor_25_25_25_25=falla; cw-test-00000000_stand-alone-floors-facade-multiplier_10_80_10_0=multa; cw-test-20250609_floormachine-test_50_50=control; cw-test-20250529_viewable-refresh_5_95=control; cw-test-20250220_viewability-test_100_0=test; cw-test-00000000_stand-alone-floors-comparison-multiplier_0_100=control; _lr_env_src_ats=false; save_search_nudge_flyout=1%251775864992919%25false; OptanonAlertBoxClosed=2026-04-10T23:50:00.187Z; RF_LAST_USER_ACTION=1775865313788%3Ad59aa38c271964e3471ba5e354be00c1149f452d; RF_PARTY_ID=106745963; RF_AUTH=dd7d10166368c6a163c3c5193d388894b0450db5; RF_W_AUTH=dd7d10166368c6a163c3c5193d388894b0450db5; RF_SECURE_AUTH=94bf69f13da3de0ec90a32e6cfeb9ef3f0d142ba; RF_ACCESS_LEVEL=2; shared_search_intros=1414098202%3D1775865318009%26dec%3D1775865318009%26ipc%3D1; _gcl_au=1.1.1481244240.1775864804.1051964403.1775865313.1775865419; RF_LDP_VIEWS_FOR_PROMPT=%7B%22viewsData%22%3A%7B%7D%2C%22expiration%22%3A%222028-04-09T23%3A59%3A41.852Z%22%2C%22totalPromptedLdps%22%3A0%7D; AMZN-Token=v2FweLxobTdlL1FzOHRlMTVsUGlobmZjQ2JSb3gvNHBaZ2tUUitjN0pjM0RiQ0t2bUhmVEczZVNrSWtPN291OEpJNVBEYzM0M1FaUDhPYjNsWEhkS2lCcERHRGVXNEc3Uy9IL1M3NFFyRGMwckpGaFNwNlBrcDVPcXJKUXhBZFB4dUFwd3JCeHhUc3MrUUF1cnZoN0Q3dGt0TWllR3ZGVFcxZUFEN1VYZzRiZ1loTDE0Ung2T2RHU2x0aFhMZGlnPWJrdgFiaXZ4HExqWHZ2NzFYNzcrOVVPKy92VVVvUFVIdnY3MD3/; unifiedLastSearch=name%3DCalifornia%26subName%3DUSA%26url%3D%252Fstate%252FCalifornia%26id%3D11_9%26type%3D11%26unifiedSearchType%3D11%26isSavedSearch%3D%26countryCode%3DUS; RF_MARKET=sacramento; RF_CORVAIR_LAST_VERSION=vLATEST; displayMode=0; segmentedControlMode=0; userPreferences=parcels%3Dtrue%26schools%3Dfalse%26mapStyle%3Ds%26statistics%3Dtrue%26agcTooltip%3Dfalse%26agentReset%3Dfalse%26ldpRegister%3Dfalse%26afCard%3D2%26schoolType%3D0%26lastSeenLdp%3DwithSharedSearchCookie%26viewedSwipeableHomeCardsDate%3D1775874893177; __gads=ID=bf43ecb96492ea3d:T=1775868987:RT=1775874901:S=ALNI_MY6cKw0QA5ig_HgI4EqHGS_FDLTtA; __gpi=UID=0000139daed471d6:T=1775868987:RT=1775874901:S=ALNI_MbpLCEFNTBOvi37Qp7qIvUEpY3_DA; __eoi=ID=96cac25f90ad3054:T=1775868987:RT=1775874901:S=AA-AfjbrgajlPUwkVWE2Td58XCov; RF_MARKET=socal; RF_BUSINESS_MARKET=5; RF_LISTING_VIEWS=212765877.211662047.213151667.208395416.211917774.211658654.192999590.204579240; RF_LAST_DP_SERVICE_REGION=2943; OptanonConsent=isGpcEnabled=0&datestamp=Sat+Apr+11+2026+12%3A08%3A05+GMT%2B0900+(Japan+Standard+Time)&version=202512.1.0&browserGpcFlag=0&isIABGlobal=false&hosts=&consentId=d2534dd6-6598-43ca-983d-91c0a8595e31&interactionCount=3&isAnonUser=1&landingPath=NotLandingPage&GPPCookiesCount=1&gppSid=8&groups=C0001%3A1%2CC0003%3A1%2CSPD_BG%3A1%2CC0002%3A1%2CC0004%3A1&crTime=1775865001808&AwaitingReconsent=false&intType=6&geolocation=US%3BCA; tatari-cookie-test=94476082; PageCount=7; _uetsid=8ba359a0353711f1bed05d519e642867|3y8pis|2|g54|0|2291; _ga=GA1.2.120725966.1775864809; _ga_928P0PZ00X=GS2.1.s1775864808$o1$g1$t1775876897$j48$l0$h0; RF_LAST_ACCESS=1775876902614%3A6747965ab60c902bdd2fa5502ee5457f0e2f1858; _uetvid=8ba37570353711f18596bd1c30c3f4e9|kropnv|1775877594797|110|1|bat.bing.com/p/conversions/c/e; RF_BROWSER_CAPABILITIES=%7B%22screen-size%22%3A2%2C%22events-touch%22%3Afalse%2C%22ios-app-store%22%3Afalse%2C%22google-play-store%22%3Afalse%2C%22ios-web-view%22%3Afalse%2C%22android-web-view%22%3Afalse%7D; _dd_s=rum=2&id=b714f481-1ece-4e6f-9a0d-721f3f951af3&created=1775864828950&expire=1775878770406; aws-waf-token=d97159b2-af69-4b40-b061-87e7f3b9a0c2:EwoAvJUWMuAHAQAA:4SQsfG6rrWxaVuH33Taw4xOMMnOy/L2C1x8xiSm+tqYlXot7uoKGJHTzISCXwtVa3dXjBw1bktsmE5xG2YaYqzsfC6K0gYeGV84fisIVM9O5NIQA15pVxwXSRxSqvecRWW0hSerkXWnm/PXE2yUKH4B3p10vRHAit9T++f56+2a7SbXT/Jt2rVzaT6h/dnJbJMi7HICpJ6ypnkQv4Dudu3RinH1rcWNUaoWMReS3sTp8BnFkkdM6o839DAgXBathhx6qeb/lrWvPzQ==',
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

            const outPath = new URL("dataset/redfin_homes.json", import.meta.url);
            fs.appendFileSync(outPath, JSON.stringify(homes, null, 2) + "\n", "utf8");

            console.log(`Extracted ${state[1]} - ${pageNum} - ${homes.length} homes → dataset/redfin_homes.json`);
        })
        .catch((error) => {
            console.error('Error:', error.message);
        });
    }
}
