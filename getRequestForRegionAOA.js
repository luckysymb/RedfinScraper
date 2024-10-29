import axios from 'axios';

const url = 'https://aaoinfo.org/wp-admin/admin-ajax.php?action=store_search&lat=38.6418278&lng=-77.3439283&max_results=25&search_radius=50'

axios.get(url, {
    headers: {
        'accept': 'application/json, text/plain, */*',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'en-US,en;q=0.9',
        'cookie': '_gcl_au=1.1.973167689.1729814066; _gid=GA1.2.597632836.1729814069; _fbp=fb.1.1729814071668.628769448827503282; _ga_T1Z7JYGXX8=GS1.1.1729814069.1.1.1729814358.10.0.0; _ga=GA1.2.1240407144.1729814069; _uetsid=dff901b0926311efbd16d3cfc5823313; _uetvid=dff92580926311ef823c75fe2e231a47',
        'priority': 'u=1, i',
        'referer': 'https://aaoinfo.org/locator/',
        'sec-ch-ua': "\"Google Chrome\";v=\"129\", \"Not=A?Brand\";v=\"8\", \"Chromium\";v=\"129\"",
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': "Windows",
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
    }
})
.then((response) => {
    console.log('Response:', response.data);
    console.log('Length: ', response.data.length);
    // response.data.Dentists.map((profile) => {
    //     console.log(profile);
    // })
})
.catch((error) => {
    console.error('Error:', error.message);
});
