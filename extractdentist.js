import Regions from "./models/regions.model.js";
import Dentists from "./models/dentists.model.js";
import mongoose from "mongoose";
import dotenv from 'dotenv';
dotenv.config();
const mongooseURL = process.env.MONGODB_URL1;

async function extractdentist(){
    const cursor = Regions.find().cursor();
    for(let doc = await cursor.next(); doc != null; doc = await cursor.next()){
        const zipcode = doc.zipcode;
        console.log('-------------------- zipcode: ', zipcode);
        const dentists = doc.dentists;
        // console.log(dentists);
        for ( let i = 0; i < dentists.length; i++){
            try{
                await Dentists.create(dentists[i]);
            } catch(error) {
                console.log('----- save error: ', error);
            }
        }
        console.log('----- Saved Successfully');
    }
}

await mongoose.connect(mongooseURL);
console.log('Connected to mongoDB');

(async () => {  
    await extractdentist();  
    // Any additional logic or cleanup can go here.  
})();  

