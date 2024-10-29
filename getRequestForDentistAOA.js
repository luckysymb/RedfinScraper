import axios from 'axios';

const url = 'https://aaoinfo.org/locator/dr-ramin-ron-hessamfar/'

axios.get(url, {
    headers: {
        'accept': 'application/json, text/plain, */*',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'en-US,en;q=0.9',
        'cookie': '_gcl_au=1.1.1325107203.1729692642; _ga=GA1.1.867235495.1729692647; OptanonAlertBoxClosed=2024-10-23T14:20:40.572Z; BE_CLA3=p_id%3D6422LAPJ4J8LRA2JR8NNL4R2RAAAAAAAAH%26bf%3D27a2a3983c4bfeae43c7fb5a5bf914fd%26bn%3D9%26bv%3D3.46%26s_expire%3D1729787661380%26s_id%3D6422LAPJ4J8LRN6APJ8NL4R2RAAAAAAAAH; OptanonConsent=isGpcEnabled=0&datestamp=Wed+Oct+23+2024+11%3A33%3A09+GMT-0700+(Pacific+Daylight+Time)&version=202402.1.0&browserGpcFlag=0&isIABGlobal=false&hosts=&landingPath=NotLandingPage&groups=C0002%3A1%2CC0003%3A1%2CC0001%3A1&geolocation=%3B&AwaitingReconsent=false; _ga_NVSBFQCBYE=GS1.1.1729707242.3.1.1729708482.0.0.0; _ga_C2503WHWW7=GS1.1.1729707187.3.1.1729708865.0.0.0',
        'priority': 'u=1, i',
        'referer': 'https://aaoinfo.org/locator/',
        'sec-ch-ua': "\"Google Chrome\";v=\"129\", \"Not=A?Brand\";v=\"8\", \"Chromium\";v=\"129\"",
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': "Windows",
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
            }
})
.then((response) => {
    console.log(response.data);
    // education
    // additionalLocation

    data = {
        education: '',
        additionalLocation: '',
    };

    console.log('data', data);
    // console.log('Response:', JSON.stringify(response.data));
})
.catch((error) => {
    console.error('Error:', error.message);
});
