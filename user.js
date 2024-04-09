const mongoose = require("mongoose")
const Schema = mongoose.Schema

const UserSchema = new Schema({
    username: String,
    email: String,
    password: String,
    emoji: String,
    role: Number,
    listing_likes: [{ type: Schema.Types.ObjectId, ref: "Listing" }],
    chats: [{ type: Schema.Types.ObjectId, ref: "Chat" }],
    comment_likes: [{ type: Schema.Types.ObjectId, ref: "Comments" }],
    comment_dislikes: [{ type: Schema.Types.ObjectId, ref: "Comments" }],
    listings: [{ type: Schema.Types.ObjectId, ref: "Listing" }],
    comments: [{ type: Schema.Types.ObjectId, ref: "Comments" }],
    last_seen: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
})

module.exports = mongoose.model("User", UserSchema)
