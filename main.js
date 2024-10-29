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

async function getCookiesForRegion(zipcode){

    const browser = await puppeteer.launch(options);
    const page = await browser.newPage();
    await page.setCacheEnabled(false);

    const url = `https://findadentist.ada.org/search-results?address=${zipcode}&searchResultsReferrer=true`

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

async function getRequestForRegion(zipcode, cookie) {
    const url = `https://findadentist.ada.org/api/Dentists?Address=${zipcode}&Photo=false&OpenSaturday=false`
    console.log('url: ', url);

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
        
        const dentists = response.data.Dentists;

        const existingDoc = await Regions.findOne({zipcode: zipcode});

        if(existingDoc) {
            console.log('---------- already exist zipcode: ', zipcode);
        } else{
            const newRegions = new Regions({
                zipcode: zipcode,
                dentists: dentists,
            });
            await newRegions.save();
        }

        await sleep(1000)
        // response.data.Dentists.map((profile) => {
        //     // Dentists.findOne({ AddressId: profile.AddressId})
        //     //     .then((res) => {
        //     //         if (res) getRequestForDentist(profile.AddressId);
        //     //         else console.log("------ Already exists: ", profile.AddressId);
        //     //     })
        //     await getRequestForDentist(profile.AddressId);
        // });
        
        for (let i = 0; i < dentists.length; i++){
            console.log("---------Dentist AddressID: ", dentists[i].AddressId);
            // try {
            await getRequestForDentist(dentists[i], cookie);
            await sleep(1000);
            // } catch(error) {
            //     console.log('----- getRequestForRegion Error:', error);
            //     const newCookie = await getCookies(page, url);
            //     await getRequestForDentist(dentists[i].AddressId, newCookie, page);
            // }
        }

    } catch(error) {
        console.log("------------ getRequestForRegion Error: ", error);
        const newCookie = getCookiesForRegion(zipcode);
        await getRequestForRegion(zipcode, newCookie);
    }


}

async function getRequestForDentist(profile, cookie){

    const addressId = profile.AddressId;
    const url = `https://findadentist.ada.org/api/DentistProfile?AddressId=${addressId}`;
    console.log('------------ address Id: ', addressId);

    try{
        const response = await axios.get(url, {
            headers: {
                'accept': 'application/json, text/plain, */*',
                'accept-encoding': 'gzip, deflate, br, zstd',
                'accept-language': 'en-US,en;q=0.9',
                'cookie': cookie,
                'priority': 'u=1, i',
                'referer': `https://findadentist.ada.org/va/prince-william/woodbridge/general-practice/dr-michael-e-king-4941190`,
                'sec-ch-ua': "\"Google Chrome\";v=\"129\", \"Not=A?Brand\";v=\"8\", \"Chromium\";v=\"129\"",
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': "Windows",
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
                    }
        });
        // console.log('Response', response.data);

        const existingDoc = await Dentists.findOne({ AddressId: response.data.Profile.AddressId});

        if(existingDoc) {
            console.log('---------- addressId already exist: ', response.data.Profile.AddressId);
        } else {
            const newDentists = new Dentists(
                response.data.Profile
            );
            await newDentists.save();

            console.log("---- push dentists");
            // console.log("---- profile: ", response.data.Profile);
            console.log("---- website: ", response.data.Profile.WebSite);
            const existed = await Clinics.findOne({ Website: response.data.Profile.WebSite });
            if(existed) {
                await Clinics.findOneAndUpdate(
                    {Website: response.data.Profile.WebSite },
                    {
                        $set: {
                            Dentists: [existed.Dentists, response.data.Profile.PersonId],
                        },
                    },
                    { upsert: true },
                );

                console.log('---------- update clinics');

            } else {
                const newClinics = new Clinics(
                    {
                        Website: response.data.Profile.WebSite,
                        Dentists: [response.data.Profile.PersonId],
                    }
                );
                await newClinics.save();
                console.log('---------- push clinic');
            }

        }

    } catch(error) {
        console.log('------------- getRequestForDentist Error: ', error.message);
        const newCookie = await getCookiesForDentist(profile);
        await getRequestForDentist(profile, newCookie);
    }
}

await mongoose.connect(mongooseURL);
console.log('Connected to mongoDB');

const zipcodeData = await readZipcode('./zipcode/zip-codes-data-virginia.json');
// console.log(zipcodeData);
// const firstUrl = `https://findadentist.ada.org/api/Dentists?Address=${}&Photo=false&OpenSaturday=false`;

for(let i = 21; i < zipcodeData.length; i++) {
    console.log('-------------------------------zipcode: ', zipcodeData[i], ' ----index: ', i);
    const cookie = await getCookiesForRegion(zipcodeData[i]);
    await getRequestForRegion(zipcodeData[i], cookie);
}

