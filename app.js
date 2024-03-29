//go to backendComments for code with comments..
//to start server use : npm start

const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require("csurf");
const flash = require('connect-flash');
const multer = require('multer');

const errorController = require('./controllers/error');
const User = require('./models/user');

const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.oz44q7i.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}`;

const app = express();
const store = new MongoDBStore({
    uri: MONGODB_URI,
    collection: 'sessions'
});

const csrfProtection = csrf();

const fileStorage = multer.diskStorage({
    destination: (req, file, cb)=> {
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        cb(null,  + Date.now()+'-'+file.originalname);
    }
});

const fileFilter = (req, file , cb) => {
    if(file.mimetype === 'image/png'|| file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg')
        cb(null, true);
    else
        cb(null, false);
};

app.set('view engine','ejs'); 
app.set('views','views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');


app.use(bodyParser.urlencoded({extended: false})); //will extract data as text..
app.use(multer({storage: fileStorage, fileFilter: fileFilter}).single('image'));
app.use(express.static(path.join(__dirname,'public')));
app.use('/images', express.static(path.join(__dirname,'images')));
//path filtering + statically serving the pages..

app.use(session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false, 
    store: store
})
); //secret is used to signing the hash, resave means session will not be saved on each reload, it'll be saved only on some change
app.use(csrfProtection);
app.use(flash());

app.use((req,res,next) => {
    if(!req.session.user){
        return next();
    }

    User.findById(req.session.user._id)
    .then(user => {
        if(!user){
            return next();
        }
        req.user = user;
        next();
    })
    .catch(err => {
        throw new Error(err);
    }); 
});

app.use((req,res,next)=>{
    res.locals.isAuthenticated = req.session.isLoggedIn;
    res.locals.csrfToken = req.csrfToken();
    next();
})


app.use('/admin',adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get('/500',errorController.get500);

app.use(errorController.get404);

app.use((error, req, res, next) => {
    res.redirect('/500');
});


//mongoose manage connection behind the scene for us..
mongoose
.connect(MONGODB_URI)
.then(result => {   
    app.listen(process.env.PORT || 3000);
})
.catch(err => {
    console.log(err)
});
