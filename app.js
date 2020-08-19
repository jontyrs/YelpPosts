// ---------- INITIALIZE ----------
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const methodOverride = require('method-override');
const Posts = require('./models/posts');
const Comments = require('./models/comments');
const Users = require('./models/users');
const seedDB = require('./seeds');

// ---------- CONNECTING DATABASE ----------
// EXECUTE THIS COMMAND IN TERMINAL BEFORE STARTING THE SERVER
// $env:DATABASEURL = 'mongodb://localhost:27017/yelp_camp'
mongoose.connect(process.env.DATABASEURL, { useNewUrlParser: true, useUnifiedTopology: true});

app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(methodOverride('_method'));

// ---------- ADD SEEDS FILE FOR IN-BUILT DATA ----------
// seedDB();

// ---------- PASSPORT CONFIGURATION ----------
app.use(require('express-session')({
    secret: 'WE ARE IN THE ENDGAME',
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(Users.authenticate()));
passport.serializeUser(Users.serializeUser());
passport.deserializeUser(Users.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
});

// ---------- REGISTER AND LOGIN ROUTES ----------
app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', (req, res) => {
    const loggedUser = new Users({username: req.body.username});
    Users.register(loggedUser, req.body.password, (err, addedUser) =>{
        if(err) {
            return res.redirect('register');
        }
        passport.authenticate('local')(req, res, () => {
            res.redirect('/posts');
        });
    });

});

app.get('/login', (req, res) => {
    res.render('login');
});

// app.get('path', middleware, callback);
app.post('/login', passport.authenticate('local', {
    successRedirect: '/posts',
    failureRedirect: '/login'
}), (req, res) => {

});

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
})

// ---------- LANDING PAGE ----------
app.get('/', (req, res) => {
    res.render('landing');
});

// ---------- POSTS ROUTES ----------
app.get('/posts', isLoggedIn, (req, res) => {
    Posts.find({}, (err, allPosts) => {
        if(err) {
            res.redirect('back');
        } else {
            res.render('posts', {postsArr: allPosts});
        }
    });
});

app.get('/posts/new', isLoggedIn, (req, res) => {
    res.render('newPosts');
});

app.post('/posts', isLoggedIn, (req, res) => {
    if(req.body.image.length === 0 || req.body.title.length === 0) {
        return res.redirect('/posts');
    }
    if(checkImageStatus(req.body.image) === false) {
        res.redirect('/posts');
    } else {
        const imageURL = req.body.image;
        const postTitle = req.body.title;
        const postDesc = req.body.description;
        var today = new Date();
        var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
        const postDate = date;
        var newPost = {image: imageURL, title: postTitle, author: null, description: postDesc, posted: postDate};
        Posts.create(newPost, (err, newlyPost) => {
            if(err) {
                res.redirect('/posts');
            } else {
                newlyPost.author.id = req.user._id;
                newlyPost.author.username = req.user.username;
                newlyPost.save();
                res.redirect('/posts');
            }
        });
    }
});

app.get('/posts/:id', isLoggedIn, (req, res) => {
    if(req.params.id === 'new')
        res.redirect('/posts/new');
    Posts.findById(req.params.id).populate('comments').exec((err, foundPost) => {
        if(err) {
            res.redirect('back');
        } else {
            res.render('show', {post: foundPost});
        }
    });
});

// ---------- COMMENTS ROUTES ----------
app.post('/posts/:id/comments', isLoggedIn, (req, res) => {
    if(req.body.text.length === 0) {
        return res.redirect('/posts/' + req.params.id);
    }
    const commentText = req.body.text;
    var newComment = {text: commentText, author: {}};
    Posts.findById(req.params.id, (err, foundPost) => {
        if(err) {
            res.redirect('/posts');
        } else {
            Comments.create(newComment, (err, newlyComment) => {
                if(err) {
                    res.redirect('/posts');
                } else {
                    newlyComment.author.id =  req.user._id;
                    newlyComment.author.username = req.user.username;
                    newlyComment.save();
                    foundPost.comments.push(newlyComment);
                    foundPost.save();
                    res.redirect('/posts/' + req.params.id);
                }
            });
        }
    });
});

app.get('/posts/:id/comments/new', isLoggedIn, (req, res) => {
    Posts.findById(req.params.id, (err, foundPost) => {
        if(err) {
            res.redirect('/posts');
        } else {
            res.render('newComments', {post: foundPost});
        }
    });
});

app.get('/posts/:id/edit', hasPostOwnership, (req, res) => {
    Posts.findById(req.params.id, (err, foundPost) => {
        if(err) {
            res.redirect('back');
        } else {
            res.render('editPosts', {post: foundPost});
        }
    });
});

app.put('/posts/:id', hasPostOwnership, (req, res) => {
    if(req.body.image.length === 0 || req.body.title.length === 0) {
        return res.redirect('/posts');
    }
    const postImage = req.body.image;
    const posttTitle = req.body.title;
    const postdescription = req.body.description;
    var changedPost = {image: postImage, title: posttTitle, description: postdescription};
    Posts.findByIdAndUpdate(req.params.id, changedPost, (err, updatedPost) => {
        if(err) {
            res.redirect('/posts');
        } else {
            res.redirect('/posts/' + req.params.id);
        }
    });
});

app.delete('/posts/:id', hasPostOwnership, (req, res) => {
    Posts.findById(req.params.id, (err, foundPost) => {
        if(err) {
            return res.redirect('/posts');
        } else {
            deleteComments(foundPost).then(() => {
                return deletePost(foundPost);
            }).catch(err => {
                res.redirect('/posts');
            });

            res.redirect('/posts/');
        }
    });
});

app.get('/posts/:id/comments/:comment_id/edit', hasCommentOwnership, (req, res) => {
    Comments.findById(req.params.comment_id, (err, foundComment) => {
        if(err) {
            res.redirect('/posts/' + req.params.id);
        } else {
            res.render('editComments', {post_id: req.params.id,  comment: foundComment});
        }
    });
});

app.put('/posts/:id/comments/:comment_id', hasCommentOwnership, (req, res) => {
    if(req.body.text.length === 0) {
        return res.redirect('/posts/' + req.params.id);
    }
    var changedComment = {text: req.body.text};
    Comments.findByIdAndUpdate(req.params.comment_id, changedComment, (err, updatedPost) => {
        if(err) {
            res.redirect('/posts');
        } else {
            res.redirect('/posts/' + req.params.id);
        }
    });
});

app.delete('/posts/:id/comments/:comment_id', hasCommentOwnership, (req, res) => {
    Comments.findByIdAndRemove(req.params.comment_id, err => {
        if(err) {
            res.redirect('back');
        } else {
            Posts.findById(req.params.id, (err, foundPost) => {
                if(err) {
                    res.redirect('/posts/' + req.params.id);
                } else {
                    const index = foundPost.comments.indexOf(req.params.comment_id);
                    if (index > -1) {
                        foundPost.comments.splice(index, 1);
                        foundPost.save();
                    }
                }
                res.redirect('/posts/' + req.params.id);
            });
        }
    });
})

// ---------- UTILITY FUNCTIONS ----------
function checkImageStatus(image) {
    res = image.split('.');
    if(res.length <= 1) {
        return false;
    }

    lastExtension = res[res.length-1];
    if(lastExtension ==='jpg' || lastExtension === 'jpeg' || lastExtension === 'png') {
        return true;
    } else {
        return false;
    }
}

function deleteComments(foundPost) {
    return new Promise((resolve, reject) => {
        foundPost.comments.forEach(com => {
            Comments.findByIdAndRemove(com, (err) => {
                if(err) {
                    res.redirect('/posts/' + foundPost._id);
                }
            });
        });
        resolve();
    });
}

function deletePost(foundPost) {
    return new Promise((resolve, reject) => {
        Posts.findByIdAndRemove(foundPost._id, (err) => {
            if(err) {
                res.redirect('/posts');
            }
        });
        resolve();
    });
}

// ---------- MIDDLEWARE ----------
function isLoggedIn(req, res, next) {
    if(req.isAuthenticated()) {
        return next();
    }

    res.redirect('/login');
}

function hasPostOwnership(req, res, next) {
    if(req.isAuthenticated()) {
        Posts.findById(req.params.id, (err, foundPost) => {
            if(err) {
                res.redirect('back');
            } else {
                if(foundPost.author.id.equals(req.user._id)) {
                    next();
                } else {
                    res.redirect('/posts/' + req.params.id);
                }
            }
        });
    } else {
        res.redirect('/login');
    }
}

function hasCommentOwnership(req, res, next) {
    if(req.isAuthenticated()) {
        Comments.findById(req.params.comment_id, (err, foundComment) => {
            if(err) {
                res.redirect('back');
            } else {
                if(foundComment.author.id.equals(req.user._id)) {
                    next();
                } else {
                    res.redirect('/posts/' + req.params.id); 
                }
            }
        })
    } else {
        res.redirect('/login')
    }
}

// ---------- STARTING APPLICATION ----------
app.listen(process.env.PORT);