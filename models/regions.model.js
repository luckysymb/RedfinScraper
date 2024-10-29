import mongoose from "mongoose";
const Schema = mongoose.Schema;

const RegionsSchema = new Schema(
    {
        zipcode: {
            type: Number,
            require: true,
        },
        dentists: {
            type: [Schema.Types.Mixed],
            require: true,
        },
    },
    {timestamps: true},
);

const Regions = mongoose.model('Regions', RegionsSchema);
export default Regions;
