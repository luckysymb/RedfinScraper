import axios from 'axios';

const url = 'https://findadentist.ada.org/api/Dentists?Address=23185&Photo=false&OpenSaturday=false'

axios.get(url, {
    headers: {
        'accept': 'application/json, text/plain, */*',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'en-US,en;q=0.9',
        'cookie': '_gcl_au=1.1.1325107203.1729692642; _ga=GA1.1.867235495.1729692647; OptanonConsent=isGpcEnabled=0&datestamp=Wed+Oct+23+2024+11%3A33%3A09+GMT-0700+(Pacific+Daylight+Time)&version=202402.1.0&browserGpcFlag=0&isIABGlobal=false&hosts=&landingPath=NotLandingPage&groups=C0002%3A1%2CC0003%3A1%2CC0001%3A1&geolocation=%3B&AwaitingReconsent=false; _ga_NVSBFQCBYE=GS1.1.1729707242.3.1.1729708482.0.0.0; _ga_C2503WHWW7=GS1.1.1729707187.3.1.1729708865.0.0.0',
        'priority': 'u=1, i',
        'referer': 'https://findadentist.ada.org/search-results?address=98672&searchResultsReferrer=true',
        'sec-ch-ua': "\"Google Chrome\";v=\"129\", \"Not=A?Brand\";v=\"8\", \"Chromium\";v=\"129\"",
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': "Windows",
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
            }
})
.then((response) => {
    console.log('Response:', response.data.Dentists);
    response.data.Dentists.map((profile) => {
        console.log(profile);
    })
})
.catch((error) => {
    console.error('Error:', error.message);
});
