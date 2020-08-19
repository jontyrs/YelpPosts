const mongoose = require('mongoose');
// WORK ON THIS IN FUTURE;
// {
//     image, title, desc, author, date, time
// }
var postSchema = new mongoose.Schema({
    image: String,
    title: String,
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        username: String
    },
    comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Comment'
        }
    ],
    description: String,
    posted: {
        type : Date,
        default: Date.now 
    }
});

var Posts = mongoose.model('Post', postSchema);

module.exports = Posts;