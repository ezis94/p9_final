var express = require("express");
var passport = require("passport");
var router = express.Router();
var u2f = require("u2f");
var https = require("https");
var randomstring = require("randomstring");
var cmd= require('node-cmd');
var request = require('request'); // "Request" library
var GoogleTokenProvider = require('refresh-token').GoogleTokenProvider;
var APP_ID = "https://localhost:4433";
var SpotifyWebApi = require('spotify-web-api-node');
var knn = require('alike');

var fs = require("fs");
var Users = {};
var User1 = require("../models/user");
var Song = require("../models/song");
var Song2 = require("../models/song2");
var fetch = require("node-fetch");
var canvas = require("canvas");
var computer = require("./modules/computer");
var Car = require("../models/user_car");
var googleMapsClient = require('@google/maps').createClient({
    clientId: '897949743059-29ad8f8jb800tcr6snvp809bj8odglsu.apps.googleusercontent.com',
    clientSecret: 'yjMA6z7XJPDF3gseGEMAeTyT',
});
var Count_songs=10;
var tempo_handle;
var User;
var Sessions = {};
const path = require('path');
const spawn = require("child_process").spawn;

//ROLE STUFF-----------------------------------------------------------------------------------------

/*const permission = ac.can('user').createOwn('video');
console.log(permission.granted);    // —> true
console.log(permission.attributes); // —> ['*'] (all attributes)
permission = ac.can('admin').updateAny('video');
console.log(permission.granted);    // —> true
console.log(permission.attributes); // —> ['title']*/
//----------------------------------------------------------------------------------------------------
// server.js
// where your node app starts

// init project
var qs = require('querystring');
var express = require('express');
var Demo = false;
var Song_attr=[];
var song_id=[];


const jssdkscopes = ["streaming", "user-read-birthdate", "user-read-email", "user-read-private", "user-modify-playback-state"];
const redirectUriParameters = {
    client_id: "8b9fff06998742eda4e4c23e1b89e2d0",
    response_type: 'token',
    scope: jssdkscopes.join(' '),
    redirect_uri: encodeURI('http://localhost:4433'),
    show_dialog: true,
}


// http://expressjs.com/en/starter/static-files.html
router.use(express.static('public'));








//Machine learning
var pythonPower = function(song_element, i,res) {

    if(i<Count_songs){
        cmd.get(

            //------optional change---------------------------

            'C:\\Users\\Edgar\\WebstormProjects\\P9-Keras\\venv\\Scripts\\python.exe C:\\Users\\Edgar\\WebstormProjects\\P9-Keras\\classify.py',
            function(err, data, stderr){
                var lines = data.split('\n');
                //-----------optional change----------------
                for(var i = 2; i < lines.length-1; i++) { // i = 2 to outcomment [INFO] messages from Python script
                    lines[i]=lines[i].replace(/\s\s+/g, ' ');

                    lines[i]=lines[i].replace(" ]","]");
                    lines[i]=lines[i].substring(1,lines[i].length-2);

                    var anylol = lines[i].split(" ");

                    console.log(lines[i]);
                    console.log(anylol[1]);
                    Song_attr.push([parseFloat(anylol[0].replace(" ","")), parseFloat(anylol[1].replace(" ","")),parseFloat(anylol[2].replace(" ",""))]);
                    if (i==2)
                        song_id.push( song_element.seed_song);
                    else
                        song_id.push(song_element.rec_songs[i-2]);
                }
                console.log(Song_attr);

                var recomends = [];
                for(var j =1;j<=Count_songs;j++){
                    recomends[j-1]={id:song_id[j], valence:Song_attr[j][0], depth:Song_attr[j][1], arousal:Song_attr[j][2]};
                   // console.log("pls"+recomends);
                }
                //KNN------------------------------------------------------------ here
                var options = {
                    k: 3
                };

                var seedSong = {
                    //id:song_id[Count_songs],
                    valence:Song_attr[0][0],
                    depth:Song_attr[0][1],
                    arousal:Song_attr[0][2]
                };
                console.log("ok"+seedSong);

                var results=knn(seedSong, recomends, options);
                console.log("These are results btw : "+ JSON.stringify(results));
                res.send(JSON.stringify({results:  results}));
            }
        );
    }
    console.log(Song_attr);
    console.log("finished python")
}

router.get("/", function(req, res, next) {
    if (!req.cookies.userid) {
        res.cookie("userid", Math.floor(Math.random() * 100000));
    }
    res.render("index", { title: "Express" });
});

router.get("/login", function(req, res, next) {
    res.render("login.ejs", { message: req.flash("loginMessage") });
});





router.get("/signup", function(req, res) {
    res.render("signup.ejs", { message: req.flash("signupMessage") });
});

router.get("/new_profile", isLoggedIn, function(req, res) {
    console.log(req.user);
    res.render("new_profile.ejs", {user: req.user});

});
router.get("/logout", function(req, res) {
    req.logout();
    res.redirect("/");
});




router.post(
    "/signup",
    passport.authenticate("local-signup", {
        successRedirect: "/new_profile",
        failureRedirect: "/signup",
        failureFlash: true
    })
);

router.post(
    "/login",
    passport.authenticate("local-login", {
        successRedirect: "/new_profile",
        failureRedirect: "/login",
        failureFlash: true
    })
);

// send to google to do the authentication

module.exports = router;

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect("/");
}