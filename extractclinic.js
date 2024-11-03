import Dentists from "./models/dentists.model.js";
import Clinics from "./models/clinics.model.js";
import mongoose from "mongoose";
import dotenv from 'dotenv';

dotenv.config();
const mongooseURL = process.env.MONGODB_URL1;

async function extractdentist(){
    const cursor = Dentists.find().cursor();
    let flag = false;
    for(let doc = await cursor.next(); doc != null; doc = await cursor.next()){
        const website = doc.website;
        const id = doc.id;

        if(doc.id == '17555'){
            flag = true;
        }

        console.log('------------------------- dentist id: ', id, ', --------- website: ', website);

        if (website) {
            if(flag){
                const clinic = await Clinics.findOne({Website: website});
                let existed = false;
                // console.log('----- clinic: ', clinic);
                if(clinic){

                    for (let i = 0; i < clinic.Dentists.length; i++){
                        // console.log('clinic dentist: ', clinic.Dentists[i], ', dentist _id: ', doc._id);
                        if(clinic.Dentists[i].toString() === doc._id.toString()){
                            console.log('----- dentist already exists: ', id);
                            existed = true;
                            break;
                        }
                    }

                    // console.log('----- existed: ', existed);

                    if(existed){
                        console.log('----- the dentist already existed: ', id);
                    } else{
                        await Clinics.updateOne(
                            { Website: website },
                            { $push: {
                                Dentists: doc._id,
                                }
                            }
                        );
                        console.log('----- Update Clinics one dentist: ', id);
                    }
                } else{
                    await Clinics.create(
                        {
                            Website: website,
                            Dentists: [doc._id],
                        }
                    )
                    console.log('----- Created clinics: ', website, '----- dentist: ', id);
                }

            } else {
                console.log('----- bypass zipcode: ', id);
            }
        } else {
            console.log('---- website doesnt exist dentist: ', doc.id);
        }
    }
}

await mongoose.connect(mongooseURL);
console.log('Connected to mongoDB');

(async () => {  
    await extractdentist();  
    // Any additional logic or cleanup can go here.  
})();  
