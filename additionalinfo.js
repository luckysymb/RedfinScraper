import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import mongoose from 'mongoose';
import Dentists from './models/dentists.model.js';
import Regions from './models/regions.model.js';
import Clinics from './models/clinics.model.js';

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
// import { profile } from 'console';

dotenv.config();
const mongooseURL = process.env.MONGODB_URL1;
const googleMapsAPI = process.env.GOOGLE_MAPS_API;

puppeteer.use(StealthPlugin());

let options = {
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ['--disable-gpu', '--disable-software-rasterizer']
}
options.headless = false;

async function getAdditionalInfo(permalink){
    try{
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
    } catch(error){
        console.log('----- getAdditionalInfo error: ', error.message);
        return ''
    }
}

async function addintodentists(){

    const cursor = Dentists.find().cursor();
    
    
    for(let doc = await cursor.next(); doc!=null; doc = await cursor.next()){
        let flag = false;
        console.log('------------------ dnetist: ', doc.id);
        
        if(doc.id == '17555'){
            flag = true;
        }

        if(flag){
            const link = doc.permalink;
            const info = await getAdditionalInfo(link);
            console.log('----- info: ', info);

            if(doc.additionalinfo != []){
                console.log('----- additional info already exist: ', doc.additionalinfo);
            } else {
                await Dentists.findOneAndUpdate(
                    {id: doc.id},
                    {
                        $set: {
                            additionalinfo: info
                        }
                    }
                );
                console.log('----- add additional info :', id);
            }
        } else {
            console.log('---- bypass dentist: ', doc.id);
        }

    }
}


await mongoose.connect(mongooseURL);
console.log('Connected to mongoDB');

(async () => {  
    await addintodentists();  
    // Any additional logic or cleanup can go here.  
})();  

// const info = await getAdditionalInfo('https://aaoinfo.org/locator/dr-ramin-ron-hessamfar/');
// console.log(info);
