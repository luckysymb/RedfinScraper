import mongoose, { mongo } from "mongoose";
const Schema = mongoose.Schema;

const ClinicsSchema = new Schema(
    {
        Website: {
            type: String,
            require: true,
        },
        Dentists: Schema.Types.Mixed,
    },
    {timestamps: true},
);

const Clinics = mongoose.model('ClinicsAAO', ClinicsSchema);
export default Clinics;