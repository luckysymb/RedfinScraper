import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const DentistsSchema = new Schema(
    {
        address: String,
        store: {
            type: String,
            required: true,
        },
        thumb: String,
        id: {
            type: String,
            required: true,
        },
        distance: Number,
        permalink: String,
        address2: String,
        city: String,
        state: String,
        zip: String,
        country: String,
        lat: String,
        lng: String,
        phone: String,
        fax: String,
        email: String,
        hours: String,
        url: String,
        website: String,
        additionalinfo: [String],
    },
    {timestamps: true},
);

const Dentists = mongoose.model('DentistsAAO', DentistsSchema);
export default Dentists;