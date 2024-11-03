import Regions from "./models/regions.model.js";
import Dentists from "./models/dentists.model.js";
import mongoose from "mongoose";
import dotenv from 'dotenv';
dotenv.config();
const mongooseURL = process.env.MONGODB_URL1;

async function extractdentist(){
    // const query = { _id: {$gt: new mongoose.Types.ObjectId('6720106b50cab847c1431874')}};

    const cursor = Regions.find().cursor();
    let flag = false;
    for(let doc = await cursor.next(); doc != null; doc = await cursor.next()){
        const zipcode = doc.zipcode;
        console.log('-------------------- zipcode: ', zipcode);
        const dentists = doc.dentists;
        if(doc.zipcode == '24012'){
            flag = true;
        }
        // console.log(dentists);
        if(flag){
            for( let i = 0; i < dentists.length; i++){
                try{
                    await Dentists.create(dentists[i]);
                    console.log('----- save dentist id: ', dentists[i].id);
                } catch(error) {
                    console.log('----- save error: ', error.keyValue);
                }
            }
            console.log('----- Saved one zipcode Successfully');
        } else{
            console.log('----- bypass zipcode: ', zipcode);
        }
    }
}

await mongoose.connect(mongooseURL);
console.log('Connected to mongoDB');

(async () => {  
    await extractdentist();  
    // Any additional logic or cleanup can go here.  
})();  

// '6720106b50cab847c1431874'