require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const session = require("express-session");
const mongoose = require("mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const PORT = process.env.PORT || 3000;


const app = express();

app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));
app.set("view engine", "ejs");

app.use(session({
    secret: "This is my secret.",
    resave: false,
    saveUninitialized: false,
    
  }));

  app.use(passport.initialize());
  app.use(passport.session());

main().catch(err => console.log(err));

  async function main(){
    await mongoose.connect("mongodb+srv://" + process.env.N1_KEY + ":" + process.env.N1_SECRET + "@cluster0.xrqe7.mongodb.net/usersdatabase");
  }

  const UserSchema = new mongoose.Schema({
    email: String,
    password: String,
    secret: Array,
    googleId: String,
    facebookId: String,
    username: String
  });

  UserSchema.plugin(passportLocalMongoose);
 UserSchema.plugin(findOrCreate);
  const User = new mongoose.model("user", UserSchema);

  passport.use(User.createStrategy());

  passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });


  passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://immense-hollows-18853.herokuapp.com/auth/google/secrets",
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({username: profile.emails[0].value , googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


passport.use(new FacebookStrategy({
    clientID: process.env.APP_ID,
    clientSecret: process.env.APP_SECRET,
    callbackURL: "https://immense-hollows-18853.herokuapp.com/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
    res.render("home");
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["openid","profile","email"] }));

  app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });


  app.get("/auth/facebook",
  passport.authenticate('facebook'));

app.get("/auth/facebook/secrets",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});


app.get("/secrets", function(req, res){
    if(req.isAuthenticated()){
     User.find({}, function(err, foundsecrets){
        if(err){
            console.log(err);
            res.redirect("/login");
        }else{
            if(foundsecrets){
                
                res.render("secrets", {usersecrets: foundsecrets});
            }
        }
     })
    }else{
        res.redirect("/login")
    }
});

app.route("/submit")

.get(function(req, res){
    if(req.isAuthenticated()){
    User.findById(req.user.id, function(err, founduser){
        if(err){
            console.log(err);
            res.redirect("/login");
        }else{
            if(founduser){
                res.render("submit", {secrets: founduser.secret});
            }
        }
    });
    }else{
        res.redirect("/login");
    }
  })

  .post(function(req, res){
    if(req.isAuthenticated()){

const secret = req.body.secret;

User.findById(req.user.id, function(err, founduser){
if(err){
    console.log(err);
    res.redirect("/submit");
}else{
    if(founduser){
        founduser.secret.push(secret);
        founduser.save(function(){
            res.redirect("/secrets");
        });
    }
}
});

    }
  });


  app.post("/submit/delete", function(req, res){
    if(req.isAuthenticated()){
        User.findById( req.user.id , function(err, founduser){
            if(err){
                console.log(err);
                res.redirect("/submit");
            }else{
                if(founduser){
                    founduser.secret.splice(founduser.secret.indexOf(req.body.secret), 1);
                    founduser.save(function(err){
                        if(!err){
                            res.redirect("/submit");
                        }
                       
                    });
                }
            }
        });
    }
  });


app.post("/register", function(req, res){

    User.register({username: req.body.username}, req.body.password, function(err, newuser){
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            if(newuser){
                passport.authenticate("local")(req, res, function(){
                    res.redirect("/secrets");
                });
            }
        }
    });


});

app.post('/login', 
  passport.authenticate('local', { failureRedirect: '/login' }), function(req, res) {
    
const user = new User({
    username: req.body.username,
    password: req.body.password
});

req.login(user, function(err){
    if(err){
        console.log(err);
        res.redirect("/login");
    }else{
        
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            })
        }
    })

  });

 

  app.listen(PORT, function(){
    console.log("Port spinned up and running");
  })