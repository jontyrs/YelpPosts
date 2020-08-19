const mongoose = require('mongoose');
const Posts = require('./models/posts');
const Comments = require('./models/comments');

data = [
    {
        image: 'https://scx1.b-cdn.net/csz/news/800/2017/theoreticala.jpg',
        title: 'Galaxy at its Peak',
        author: 'Jonty BABA'
    },
    {
        image: 'https://b2h3x3f6.stackpathcdn.com/assets/landing/img/main-bg.jpg',
        title: 'Himalayas at sun rise',
        author: 'RSJ'
    },
    {
        image: 'https://cdn.pixabay.com/photo/2015/04/23/22/00/tree-736885__340.jpg',
        title: 'Beautiful Nature at Dawn',
        author: 'Rachnit'
    },
    {
        image: 'https://p.bigstockphoto.com/GeFvQkBbSLaMdpKXF1Zv_bigstock-Aerial-View-Of-Blue-Lakes-And--227291596.jpg',
        title: 'Great Indian Lake in THE NORTH',
        author: 'Jonty'
    }
]

function seedDB() {
    Posts.deleteMany({}, (err) => {
        if(err) {
            console.log(err);
        } else {
            console.log('Removed Existing Posts');
            Comments.deleteMany({}, (err) => {
                if(err) {
                    console.log(err);
                } else {
                    data.forEach(element => {
                        Posts.create(element, (err, addedPost) => {
                            if(err) {
                                console.log(err);
                            } else {
                                console.log("ADDED POST");
                                // Create Comments
                                Comments.create({
                                    text: 'THIS IS THE ONLY COMMENT FOR NOW ON',
                                    author: 'Rachnit'
                                }, (err, createdComment) => {
                                    if(err) {
                                        console.log(err);
                                    } else {
                                        addedPost.comments.push(createdComment);
                                        addedPost.save();
                                        console.log('CREATED COMMENT');
                                    }
                                })
                            }
                        })
                    });
                }
            });
        }
    });
}

module.exports = seedDB;