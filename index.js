import puppeteer from 'puppeteer-extra'
import { click, disableLogger, findElement, delay } from 'puppeteer-utilz'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'  
puppeteer.use(StealthPlugin())  

const siteurl = "https://findadentist.ada.org/search-results?address=22193&searchResultsReferrer=true";

function wait(milliseconds) {
    return new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    });
}

async function getCookies(page, url){
    try {
        await page.goto(url, {
            waitUntil: "networkidle0",
        });

        const cookies = await page.cookies();

        console.log(" --- cookies ----- \n", cookies);
        console.log(" ---- length of cookies: ", cookies.length);

        var cookiesurl = '';

        for( let i = 0; i < cookies.length; i++){
            cookiesurl = cookiesurl + cookies[i].name + '=' + cookies[i].value + ';';
        }

        console.log(' ---- cookie url: ', cookiesurl);



    } catch(error) {
        console.log('error', error);
    }
}

let options = {
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ['--disable-gpu', '--disable-software-rasterizer']
}

options.headless = false;

console.log('Log => headless: ', options.headless);

const browser = await puppeteer.launch(options);
const page = await browser.newPage();
await page.setCacheEnabled(false);

await getCookies(page, siteurl);
browser.close();

