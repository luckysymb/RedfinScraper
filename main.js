import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import Dentists from './models/dentists.model.js';
import Regions from './models/regions.model.js';
import Clinics from './models/clinics.model.js';

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
// import { profile } from 'console';

dotenv.config();
const mongooseURL = process.env.MONGODB_URL;
const googleMapsAPI = process.env.GOOGLE_MAPS_API;

puppeteer.use(StealthPlugin());

let options = {
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ['--disable-gpu', '--disable-software-rasterizer']
}
options.headless = true

function customToLowerCase(str) {
    let result = '';
    for (let char of str) {
        result += char.toLowerCase(); // Using built-in method for each character
    }
    return result;
}

async function getLocationFromZipcode(zipcode){
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${zipcode}&key=${googleMapsAPI}`;

    const response = await axios.get(url);
    // console.log('--getLocationFromZipcode; ', response.data.results[0].geometry.location);
    return response.data.results[0].geometry.location;
}

async function getAdditionalInfo(permalink){
    const browser = await puppeteer.launch(options);
    const page = await browser.newPage();
    await page.setCacheEnabled(false);

    await page.goto(permalink, {
        waitUntil: "networkidle0",
        timeout: 120000,
    })

    const address = await page.evaluate(() => {
        const el = document.querySelector('.aao_other_locations');
        return el ? el.innerText.split('\n') : 'Address not found';
    });

    // .replace(/\s+/g, '').trim()

    await page.close();
    await browser.close();

    return address
}

async function getCookiesForRegion(){

    const browser = await puppeteer.launch(options);
    const page = await browser.newPage();
    await page.setCacheEnabled(false);

    const url = `https://aaoinfo.org/locator/`;

    await page.goto(url, {
        waitUntil: "networkidle0",
        timeout: 120000,
    });

    const cookies = await page.cookies();

    await page.close();

    await browser.close();

    // console.log(" --- cookies ----- \n", cookies);
    console.log(" ---- length of cookies: ", cookies.length);

    var cookiesurl = '';

    for( let i = 0; i < cookies.length; i++){
        cookiesurl = cookiesurl + cookies[i].name + '=' + cookies[i].value + ';';
    }

    console.log(' ---- cookie url: ', cookiesurl);
    return cookiesurl;
}

async function getCookiesForDentist(profile){
    
    const browser = await puppeteer.launch(options);
    const page = await browser.newPage();
    await page.setCacheEnabled(false);

    const state = String(profile.State).toLowerCase();
    const county = String(profile.County).toLowerCase().replace(/ /g, '-').replace(/[.,]/g, '');
    const city = String(profile.City).toLowerCase().replace(/ /g, '-').replace(/[.,]/g, '');
    const specialty = String(profile.Specialty.Type).toLowerCase().replace(/ /g, '-');
    const tagname = String(profile.TagName).toLowerCase().replace(/ /g, '-').replace(/[.,]/g, '');
    const addressid = String(profile.AddressId);

    const url = `https://findadentist.ada.org/${state}/${county}/${city}/${specialty}/${tagname}-${addressid}`;

    await page.goto(url, {
        waitUntil: "networkidle0",
    });

    const cookies = await page.cookies();

    await page.close();
    await browser.close();

    // console.log(" --- cookies ----- \n", cookies);
    console.log(" ---- length of cookies: ", cookies.length);

    var cookiesurl = '';

    for( let i = 0; i < cookies.length; i++){
        cookiesurl = cookiesurl + cookies[i].name + '=' + cookies[i].value + ';';
    }

    console.log(' ---- cookie url: ', cookiesurl);
    return cookiesurl;
}

function readZipcode(path){
    return new Promise((resolve, reject) => {
        fs.readFile(path, 'utf-8', (err, data) => {
            if (err) {
                console.error('Error reading file:', err);
                return;
            }
            const jsonData = JSON.parse(data);
            console.log(jsonData.map(zip => zip.zip));
            // console.log(zipCodeData); // Output the content of the file

            const zipcodeData = jsonData.map(zip => zip.zip);
            return resolve(zipcodeData);
        });
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function existAddressId(addressId){
    const existingDoc = Dentists.findOne({ AddressId: addressId});
    if (existingDoc) return true;
    else return false;
}

async function getRequestForRegion(zipcode, cookie, code) {
    const location = await getLocationFromZipcode(zipcode);
    const url = `https://aaoinfo.org/wp-admin/admin-ajax.php?action=store_search&lat=${location.lat}&lng=${location.lng}&max_results=100&search_radius=15`
    console.log('url: ', url, ', ', code);

    try{
        const response = await axios.get(url, {
            headers: {
                'accept': 'application/json, text/plain, */*',
                'accept-encoding': 'gzip, deflate, br, zstd',
                'accept-language': 'en-US,en;q=0.9',
                'cookie': cookie,
                'priority': 'u=1, i',
                // 'referer': `https://findadentist.ada.org/search-results?address=${zipcode}&searchResultsReferrer=true`,
                'sec-ch-ua': "\"Google Chrome\";v=\"129\", \"Not=A?Brand\";v=\"8\", \"Chromium\";v=\"129\"",
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': "Windows",
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
                    }
        });
        
        const dentists = response.data;
        // console.log('---- response data: \n', dentists);

        const existingDoc = await Regions.findOne({zipcode: zipcode});

        if(existingDoc) {
            console.log('---------- already exist zipcode: ', zipcode);
        } else{
            const newRegions = new Regions({
                zipcode: zipcode,
                dentists: dentists,
            });
            await newRegions.save();
            console.log('---------- push region: ', zipcode, ', ', dentists.length);
        }

        // await sleep(1000)
        
        // for (let i = 0; i < dentists.length; i++){
        //     console.log("---------Dentist AddressID: ", dentists[i].AddressId);
        //     await getRequestForDentist(dentists[i], cookie);
        //     await sleep(1000);
        // }

    } catch(error) {
        console.log("------------ getRequestForRegion Error: ", error);
        const newCookie = getCookiesForRegion();
        await getRequestForRegion(zipcode, newCookie, code);
    }

}

async function getRequestForDentist(profile){
    const permalink = profile.permalink;
    try{
        const existingDoc = await Dentists.findOne({ id: profile.id});
        
        if(existingDoc) {
            console.log('---------- addressId already exist: ', profile.id);
        } else {
            // Get additional location info
            const additionalinfo = await getAdditionalInfo(permalink);
            profile.additionalinfo = additionalinfo;

            const newDentists = new Dentists(
                profile
            );
            await newDentists.save();

            console.log("---- push dentists");
            console.log("---- website: ", profile.website);
            const existed = await Clinics.findOne({ Website: profile.website });
            if(existed) {
                await Clinics.findOneAndUpdate(
                    {Website: profile.website },
                    {
                        $set: {
                            Dentists: [existed.Dentists, profile.id],
                        },
                    },
                    { upsert: true },
                );
                console.log('---------- update clinics');
            } else {
                const newClinics = new Clinics(
                    {
                        Website: profile.website,
                        Dentists: [profile.id],
                    }
                );
                await newClinics.save();
                console.log('---------- push clinic');
            }
        }
    } catch(error) {
        console.log('------------- getRequestForDentist Error: ', error.message);
    }
}

await mongoose.connect(mongooseURL);
console.log('Connected to mongoDB');

const zipcodeData = await readZipcode('./zipcode/zip-codes-data-virginia.json');
const cookie = await getCookiesForRegion();

for(let i = 0; i < zipcodeData.length; i++) {
    console.log('-------------------------------zipcode: ', zipcodeData[i], ' ----index: ', i);
    await getRequestForRegion(zipcodeData[i], cookie, i);
}
// getLocationFromZipcode(22193)

// const address = await getAdditionalInfo('https://aaoinfo.org/locator/dr-ramin-ron-hessamfar/');
// console.log(address);