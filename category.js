const mongoose = require("mongoose")
const Schema = mongoose.Schema

const CategorySchema = new Schema({
    title: String,
    listings: [{ type: Schema.Types.ObjectId, ref: "Listing" }],
    meta_description: String,
})

module.exports = mongoose.model("Category", CategorySchema)
