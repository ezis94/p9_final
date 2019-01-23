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
var Count_songs=5;
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
// init Spotify API wrapper

var SpotifyWebApi = require('spotify-web-api-node');

var spotifyApi = new SpotifyWebApi({
    clientId : "8b9fff06998742eda4e4c23e1b89e2d0",
    clientSecret : "bb00e746afe14aa2b48d9dae4f0b3923",
});

const jssdkscopes = ["streaming", "user-read-birthdate", "user-read-email", "user-read-private", "user-modify-playback-state"];
const redirectUriParameters = {
    client_id: "8b9fff06998742eda4e4c23e1b89e2d0",
    response_type: 'token',
    scope: jssdkscopes.join(' '),
    redirect_uri: encodeURI('http://localhost:4433'),
    show_dialog: true,
}

const redirectUri = `https://accounts.spotify.com/authorize?${qs.stringify(redirectUriParameters)}`;
var spotify_expire;
function authenticate(callback) {
    spotifyApi.clientCredentialsGrant()
        .then(function(data) {
            console.log('The access token expires in ' + data.body['expires_in']);
            console.log('The access token is ' + data.body['access_token']);

            var date = new Date().getTime();
            spotify_expire=date+data.body['expires_in'];
            callback instanceof Function && callback();

            // Save the access token so that it's used in future calls
            spotifyApi.setAccessToken(data.body['access_token']);
        }, function(err) {
            console.log('Something went wrong when retrieving an access token', err.message);
        });
}
authenticate();

// http://expressjs.com/en/starter/static-files.html
router.use(express.static('public'));

router.get("/search", function (request, response) {
    reAuthenticateOnFailure((failure) => {
        spotifyApi.searchTracks(request.query.query, { limit: 2 })
            .then(function(data) {
                response.send(data.body);
            }, failure);
    })
});

const reAuthenticateOnFailure = (action) => {
    action(() => {
        authenticate(action);
    })
}

router.get("/spotifyRedirectUri", function (request, response) {
    response.send(JSON.stringify({
        redirectUri
    }, null, 2))
});

router.get("/features", function (request, response) {
    reAuthenticateOnFailure((failure) => {
        spotifyApi.getAudioFeaturesForTrack(request.query.id)
            .then(function(data) {
                response.send(data.body);
            }, failure);
    });
});
router.get("/analysis", function (request, response) {
    reAuthenticateOnFailure((failure) => {
        spotifyApi.getAudioAnalysisForTrack(request.query.id)
            .then(function(data) {
                response.send(data.body);
            }, failure);
    });
});
router.get("/playlistanalysis", function (request, response) {
    reAuthenticateOnFailure((failure) => {

        spotifyApi.getPlaylistTracks(request.query.name,request.query.id)
            .then(function(data) {
                console.log("Here i am " + JSON.stringify(data));

                data.body.items.forEach(function(element) {
                    process.nextTick(function () {
                        Song.findOne({"song.id": element.track.id}, function (err, song) {
                            if (err) return done(err);

                            else {
                                reAuthenticateOnFailure((failure) => {
                                    spotifyApi.getAudioFeaturesForTrack(element.track.id)
                                        .then(function(data2) {
                                            reAuthenticateOnFailure((failure) => {
                                                spotifyApi.getAudioAnalysisForTrack(element.track.id)
                                                    .then(function(data) {
                                                        var newSong = new Song2();

                                                        newSong.song.id = element.track.id;
                                                        newSong.song.name = element.track.name;
                                                        element.track.artists.forEach(function(art) {
                                                            newSong.song.artists.push(art.name);
                                                        });
                                                        var loud = 0;
                                                        if (data2.body.loudness > -23) {
                                                            loud = (data2.body.loudness + 23) / 23;
                                                            newSong.song.arousal = data2.body.acousticness * (-0.8) * (-0.65) + data2.body.energy * (0.94) * (0.86) + loud * (0.88) * (0.86);
                                                        }
                                                        else {
                                                            loud = (data2.body.loudness + 60) / 37;
                                                            newSong.song.arousal = data2.body.acousticness * (-0.8) * (-0.65) + data2.body.energy * (0.94) * (0.86) + loud * (-0.81) * (-0.65);
                                                        }

                                                        newSong.song.depth = data2.body.danceability * (-0.54) * (-0.57) + data2.body.instrumentalness * (0.84) * (0.89);

                                                        newSong.song.valence = data2.body.valence;

                                                        newSong.save(function (err) {
                                                            if (err) throw err;
                                                            else console.log("done");

                                                        });  }, failure);
                                            });

                                        }, failure);
                                });

                            }
                        });
                    });                });
            }, failure);


    });});


var solver = function(element,i){
    console.log("this is elem " + element[i].song.id + " and " + i);
    if (i<2074){
        i++
        var date = new Date().getTime();
if (spotify_expire>=date)authenticate();
        fetch(`https://api.spotify.com/v1/audio-analysis/`+element[i].song.id, {
            headers: {
                Authorization: `Bearer ` + spotifyApi.getAccessToken()
            }
        })
            .then(d => d.json())
            .then(data => {
                if(!data.segments & typeof failure === "function") {
                    return failure();
                };
                console.log(data.segments.length);
                (result => {




                    var out = fs.createWriteStream('./test_' + i + '.png')
                    var stream = draw(result).createPNGStream()
                    stream.pipe(out)

                    out.on('finish', () =>{ console.log('The PNG file was created.'+i); solver(element,i);})



                })(computer(data));
            })

    }
}

router.get("/spotifyanalysis", function (req, res) {

    process.nextTick(function () {
        Song2.find({},function(err, element) {
            if (err) return done(err);

            else {
                //    result.forEach(function(element) {
//var i=7

                solver(element,0);
                //          });


            }
        });
    });
});

var solver_post = function(element,i) {


    if(i<Count_songs) {
        var date = new Date().getTime();
        if (spotify_expire >= date) authenticate();
        console.log("hello");

        console.log(JSON.stringify(element));

        fetch(`https://api.spotify.com/v1/audio-analysis/` + element.rec_songs[i], {
            headers: {
                Authorization: `Bearer ` + spotifyApi.getAccessToken()
            }
        })
            .then(d => d.json())
            .then(data => {
                if (!data.segments & typeof failure === "function") {
                    return failure();
                }
                ;
                console.log(data.segments.length);
                (result => {

                    //console.log("result " + result);

                    var out = fs.createWriteStream('C:\\Users\\dimix\\WebstormProjects\\p9_final\\100_figs\\test_' + i + '.png')
                    var stream = draw(result).createPNGStream()

                    stream.pipe(out)

                    out.on('finish', () => {
                        console.log('The PNG file was created.' + i);
                        i++;
                       return solver_post(element, i);
                    })


                })(computer(data));
            })

    }
    else if(i==Count_songs){
        var date = new Date().getTime();
        if (spotify_expire >= date) authenticate();
        console.log("hello");

       // console.log(JSON.stringify(element));

        fetch(`https://api.spotify.com/v1/audio-analysis/` + element.seed_song, {
            headers: {
                Authorization: `Bearer ` + spotifyApi.getAccessToken()
            }
        })
            .then(d => d.json())
            .then(data => {
                if (!data.segments & typeof failure === "function") {
                    return failure();
                }
                ;
                console.log(data.segments.length);
               /* var new_data=[];
                for(var j=element.seek_time;j<=element.end_time;j++){
                    new_data.push(data.segments[j]);
                }*/
               //data.segments.slice(element.seek_time,element.end_time+1);
               // console.log(data.segments.length);

                (result => {

                    console.log("result " );

                    var out = fs.createWriteStream('C:\\Users\\dimix\\WebstormProjects\\p9_final\\100_figs\\seed.png')
                    var stream = draw(result.slice(element.seek_time,element.end_time+1)).createPNGStream()
                    stream.pipe(out)
                   // console.log(result.length);
                    out.on('finish', () => {
                        console.log('The PNG file was created.' + i);
                        i++;
                        //HERE WE CALL PYTHON!!!!!!!!!!-----------------------------------------------------------------------
                        //solver_post(element, i);
                        return pythonPower(element,0);
                    })


                })(computer(data));
            })
    }

}
router.post("/spotifyanalysis", function(req, res) {
    console.log("I am in request "+req.body.seek_time + "," +req.body.end_time);
    Demo=true;
    if (Demo==false){
        fs.readdir('C:\\Users\\dimix\\WebstormProjects\\p9_final\\100_figs', (err, files) => {
            if (err) throw err;

            for (const file of files) {
                fs.unlink(path.join('C:\\Users\\dimix\\WebstormProjects\\p9_final\\100_figs', file), err => {
                    if (err) throw err;
                });
            }
        });
        res.send(JSON.stringify({results:  solver_post(req.body,0)}));


    }
    else {

        res.send(JSON.stringify({results:  pythonPower(req.body,0)}));


    }

});
var pythonPower = function(song_element, i) {
    // var process = spawn("python", ["C:\\Users\\dimix\\PycharmProjects\\keras-multi-label\\classify.py", "C:\\Users\\dimix\\PycharmProjects\\keras-multi-label\\fashion.model", 'C:\\Users\\dimix\\WebstormProjects\\p9_final\\100_figs\\seed.png']);
    //
    // process.stdout.on('data',function(data){
    //    console.log("pls print out" +data.toString());
    // })
    if(i<Count_songs){
        cmd.get(

            //------optional change---------------------------

            'C:\\Users\\dimix\\PycharmProjects\\keras-multi-label\\venv\\Scripts\\python.exe C:\\Users\\dimix\\PycharmProjects\\keras-multi-label\\classify.py  C:\\Users\\dimix\\PycharmProjects\\keras-multi-label\\fashion.model "C:\\Users\\dimix\\WebstormProjects\\p9_final\\100_figs\\test_' + i + '.png"',
            function(err, data, stderr){
                //console.log('what is our data  :',data)
                var lines = data.split('\n');
                // for(var i = 2;i < lines.length-1;i++){
                //     //code here using lines[i] which will give you each line
                //     console.log('what is our data  :' + lines[i]);
                // }

                //-----------optional change----------------

                Song_attr.push([parseFloat(lines[2]) ,parseFloat(lines[3]),parseFloat(lines[4])]);
                song_id.push( song_element.rec_songs[i]);
                i++;
                pythonPower(song_element,i);
            }
        );
    }
    else if (i==Count_songs){
        cmd.get(

            //------optional change---------------------------

            'C:\\Users\\dimix\\PycharmProjects\\keras-multi-label\\venv\\Scripts\\python.exe C:\\Users\\dimix\\PycharmProjects\\keras-multi-label\\classify.py  C:\\Users\\dimix\\PycharmProjects\\keras-multi-label\\fashion.model "C:\\Users\\dimix\\WebstormProjects\\p9_final\\100_figs\\seed.png"',
            function(err, data, stderr){
                //console.log('what is our data  :',data)
                var lines = data.split('\n');
                // for(var i = 2;i < lines.length-1;i++){
                //     //code here using lines[i] which will give you each line
                //     console.log('what is our data  :' + lines[i]);
                // }

                //-----------optional change----------------

                Song_attr.push([parseFloat(lines[2]) ,parseFloat(lines[3]),parseFloat(lines[4])]);
                song_id.push( song_element.seed_song);
                var recomends = [];
                for(var j =0;j<Count_songs;j++){
                    recomends[j]={id:song_id[j], valence:Song_attr[j][0], depth:Song_attr[j][1], arousal:Song_attr[j][2]};
                    console.log("pls"+recomends);
                }
                //KNN------------------------------------------------------------ here
                var options = {
                    k: 2

                };

                var seedSong = {
                    //id:song_id[Count_songs],
                    valence:Song_attr[Count_songs][0],
                    depth:Song_attr[Count_songs][1],
                    arousal:Song_attr[Count_songs][2]
                };
                console.log("ok"+seedSong);

                var results=knn(seedSong, recomends, options);
                console.log("These are results btw : "+ JSON.stringify(results));
                return results;
            }
        );
    }
    /* debug code
    else {
        //KNN------------------------------------------------------------ here
        var recomends = [ {id:"6666777674", valence:0.3437869, depth:0.2600239, arousal:0.39618927},
            {id:"2MIffMNLanOcWNLVwbeUYE",valence:0.1700128, depth:0.07984439, arousal:0.75014275},
            {id:"6op1lgxcCSNwzQvEFizPRS",valence:0.16052987, depth:0.18860374, arousal:0.6508664},
            {id:"shjgkjgjhksa",valence:0.16343644, depth:0.1981395, arousal:0.63842404},
            {id:"s432",valence:0.36749807, depth:0.17309053, arousal:0.45941135}];
        var options = {
            k: 2,

        };

        var seedSong = {
            //id:"dsafas",
            valence:0.16240801,
            depth:0.12835155,
            arousal:0.70924044
        };
        console.log("ok"+JSON.stringify(seedSong));

        var results=knn(seedSong, recomends, options);
        console.log("These are results btw : "+ JSON.stringify(results));
return results;
    } */
    console.log(Song_attr);
     console.log("finished python")
}

router.get("/playnewlistanalysis", function (request, response) {
    process.nextTick(function () {
//Song.update({}, {$unset: {"song.$.notes":1}} , {multi: true});

        Song.find({},function(err, element) {
            if (err) return done(err);

            else {
                //    result.forEach(function(element) {
//var i=7
                console.log("pls");
                for(var i=0;i<112;i++) {
                    var newSong = new Song2();

                    newSong.song.id = element[i].song.id;
                    newSong.song.name = element[i].song.name;
                    newSong.song.artists = element[i].song.artists;
                    var loud = 0;
                    if (element[i].song.loudness > -23) {
                        loud = (element[i].song.loudness + 23) / 23;
                        newSong.song.arousal = element[i].song.acousticness * (-0.8) * (-0.65) + element[i].song.energy * (0.94) * (0.86) + loud * (0.88) * (0.86);
                    }
                    else {
                        loud = (element[i].song.loudness + 60) / 37;
                        newSong.song.arousal = element[i].song.acousticness * (-0.8) * (-0.65) + element[i].song.energy * (0.94) * (0.86) + loud * (-0.81) * (-0.65);
                    }

                    newSong.song.depth = element[i].song.danceability * (-0.54) * (-0.57) + element[i].song.instrumentalness * (0.84) * (0.89);

                    newSong.song.valence = element[i].song.valence;

                    newSong.save(function (err) {
                        if (err) throw err;
                        else console.log("done");

                    });
                }
                //          });


            }
        }).skip(1900).limit( 112 );
    });
});
// listen for requests :)

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

router.get("/profile", isLoggedIn, function(req, res) {
    console.log(req.user);
    var date = new Date().getTime();

    var user1 = req.user;

    if (req.user.spotify.expires <= date) {
        console.log(date);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            headers: {'Authorization': 'Basic ' + (new Buffer('8b9fff06998742eda4e4c23e1b89e2d0:bb00e746afe14aa2b48d9dae4f0b3923').toString('base64'))},
            form: {
                grant_type: 'refresh_token',
                refresh_token: req.user.spotify.refresh
            },
            json: true
        };
        request.post(authOptions, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                var access_token = body.access_token;
                var expire_in = body.expires_in;
                console.log(JSON.stringify(body));
                process.nextTick(function () {
                    User1.findOne({"local.email": user1.local.email}, function (err, user) {
                        if (err) return done(err);
                        if (!user)
                            return done(null, false, req.flash("loginMessage", "No user found1."));
                        else {

                            user.spotify.access = access_token;
                            var date = new Date().getTime();

                            var t = parseInt(expire_in, 10) * 1000;
                            console.log(t);
                            user.spotify.expires = date + t;
                            user.save(function (err) {
                                if (err) throw err;
                            });
                        }
                    });
                });
            }
        });
    }


    res.render("profile.ejs", {user: req.user});

});
router.get("/new_profile", isLoggedIn, function(req, res) {
    console.log(req.user);
    var date = new Date().getTime();

    var user1 = req.user;

    if (req.user.spotify.expires <= date) {
        console.log(date);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token',
            headers: {'Authorization': 'Basic ' + (new Buffer('8b9fff06998742eda4e4c23e1b89e2d0:bb00e746afe14aa2b48d9dae4f0b3923').toString('base64'))},
            form: {
                grant_type: 'refresh_token',
                refresh_token: req.user.spotify.refresh
            },
            json: true
        };
        request.post(authOptions, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                var access_token = body.access_token;
                var expire_in = body.expires_in;
                console.log(JSON.stringify(body));
                process.nextTick(function () {
                    User1.findOne({"local.email": user1.local.email}, function (err, user) {
                        if (err) return done(err);
                        if (!user)
                            return done(null, false, req.flash("loginMessage", "No user found1."));
                        else {

                            user.spotify.access = access_token;
                            var date = new Date().getTime();

                            var t = parseInt(expire_in, 10) * 1000;
                            console.log(t);
                            user.spotify.expires = date + t;
                            user.save(function (err) {
                                if (err) throw err;
                            });
                        }
                    });
                });
            }
        });
    }
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

router.post(

    "/changerole", function(req, res) {
        var permission = ac.can(req.user.local.ROLE).updateAny('role');
        if (permission.granted){
            process.nextTick(function () {
                User1.findOne({"local.email": req.body.id}, function (err, user) {
                    if (err) return res.send(err);
                    else {
                        user.local.ROLE=req.body.role;
                        user.save(function (err) {
                            if (err) throw err;
                            res.send(JSON.stringify({stat: true}));
                        });
                    }
                });
            });
        }
    });




router.get(
    "/auth/facebook",
    passport.authenticate("facebook", { scope:[ "email","user_birthday","user_location","user_hometown","user_likes","user_tagged_places"] })
);

router.get(
    "/auth/facebook/callback",
    passport.authenticate("facebook", {
        successRedirect: "/profile",
        failureRedirect: "/"
    })
);

router.get("/auth/twitter", passport.authenticate("twitter"));

router.get(
    "/auth/twitter/callback",
    passport.authenticate("twitter", {
        successRedirect: "/profile",
        failureRedirect: "/"
    })
);

router.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
    "/auth/google/callback",
    passport.authenticate("google", {
        successRedirect: "/profile",
        failureRedirect: "/"
    })
);

router.get('/auth/spotify',
    passport.authenticate('spotify',{ scope: ["user-read-birthdate", "user-read-email", "user-read-private ","user-modify-playback-state", "playlist-read-private","streaming","user-follow-read","user-read-currently-playing"] }),
    function(req, res){
        // The request will be redirected to spotify for authentication, so this
        // function will not be called.
    });

router.get('/auth/spotify/callback',
    passport.authenticate('spotify', { failureRedirect: '/login' }),
    function(req, res) {
        // Successful authentication, redirect home.
        res.redirect('/new_profile');
    });

router.get("/api/register_request", function(req, res) {
    var authRequest = u2f.request(APP_ID);
    console.log(authRequest);
    Sessions[req.cookies.userid] = { authRequest: authRequest };
    res.send(JSON.stringify(authRequest));
});

router.get("/api/sign_request", function(req, res) {
    //var s=JSON.parse(req.user.local);
    console.log("THIS IS HANLD    " + req.user.local.handle.length);
    var authRequest = [];
    for (i = 0; i < req.user.local.handle.length; i++) {
        authRequest[i] = u2f.request(APP_ID, JSON.parse(req.user.local.handle[i]));
        authRequest[i].challenge = authRequest[0].challenge;
    }
    //var authRequest = u2f.request(APP_ID, JSON.parse(req.user.local.handle[0]));

    console.log("THIS IS AUTH    " + JSON.stringify(authRequest));

    Sessions[req.cookies.userid] = { authRequest: authRequest[0] };
    res.send(JSON.stringify(authRequest));
});



// google ---------------------------------

// send to google to do the authentication
router.get('/connect/google', passport.authorize('google', { scope : ['profile', 'email', 'https://www.googleapis.com/auth/calendar.readonly'],accessType: 'offline', approvalPrompt: 'force'  }));

// the callback after google has authorized the user

router.get('/connect/google/callback',
    passport.authorize('google', {
        successRedirect : '/profile',
        failureRedirect : '/'
    }));
router.get('/unlink/google', isLoggedIn, function(req, res) {
    var user          = req.user;
    user.google.token = undefined;
    user.google.refresh = undefined;
    user.google.email = undefined;
    user.google.expires = undefined;
    user.google.id = undefined;
    user.google.name = undefined;

    user.save(function(err) {
        res.redirect('/profile');
    });
});
router.get('/unlink/spotify', isLoggedIn, function(req, res) {
    var user          = req.user;
    user.spotify.access = undefined;
    user.spotify.refresh = undefined;
    user.spotify.expires = undefined;
    user.spotify.spotifyId = undefined;

    user.save(function(err) {
        res.redirect('/profile');
    });
});
router.post(
    "/authorize",
    passport.authenticate("local-auth", {
        successRedirect: "/profile_car",
        failureRedirect: "/loginu2fcar",
        failureFlash: true
    })
);
router.post("/api/register", function(req, res) {
    console.log(req.body);
    var checkRes = u2f.checkRegistration(
        Sessions[req.cookies.userid].authRequest,
        req.body
    );
    console.log(checkRes);
    if (checkRes.successful) {
        Users[req.cookies.userid] = {
            publicKey: checkRes.publicKey,
            keyHandle: checkRes.keyHandle
        };
        User = { publicKey: checkRes.publicKey, keyHandle: checkRes.keyHandle };

        res.send(JSON.stringify({ stat: true, usr: User }));
    } else {
        res.send(checkRes.errorMessage);
    }
    console.log(User);
});

router.post("/api/authenticatecar", function(req, res) {
    tempo_handle = req.body.keyHandle;
    var checkRes;
    var j = req.user.local.handle.indexOf(JSON.stringify(req.body.keyHandle));
    console.log(j);
    checkRes = u2f.checkSignature(
        Sessions[req.cookies.userid].authRequest,
        req.body,
        req.user.local.publickey[j]
    );
    console.log(checkRes);
    if (checkRes.successful) {
        res.send({ success: true, secretData: req.user.local.handle[j] });
    } else {
        res.send({ error: checkRes.errorMessage });
    }
});
router.post("/api/authenticate", function(req, res) {
    tempo_handle = req.body.keyHandle;
    var checkRes;
    var j = req.user.local.handle.indexOf(JSON.stringify(req.body.keyHandle));
    console.log(j);
    checkRes = u2f.checkSignature(
        Sessions[req.cookies.userid].authRequest,
        req.body,
        req.user.local.publickey[j]
    );
    console.log(checkRes);
    if (checkRes.successful) {
        res.send({ success: true, secretData: "euueueueu" });
    } else {
        res.send({ error: checkRes.errorMessage });
    }
});

router.post("/spotify_status", function(req, res) {
    process.nextTick(function() {
        User1.findOne({ "local.email": req.user.local.email }, function(err, user) {
            if (err) return done(err);
            if (!user)
                return done(null, false, req.flash("loginMessage", "No user found."));
            else {




                console.log( req.body.mapon);
                User1.update({"local.email": req.user.local.email}, {
                    "spotify.enabled": req.body.spoton,

                }, function(err, numberAffected, rawResponse) {
                    console.log(JSON.stringify(user));

                    res.send(JSON.stringify({ stat: true}));
                });








            }
        });
    });
});
router.get("/image/:id", function(request, response) {
    console.log(request.params.id);
    reAuthenticateOnFailure(failure =>
        fetch(`https://api.spotify.com/v1/audio-analysis/${request.params.id}`, {
            headers: {
                Authorization: `Bearer BQBzvJDxzoHHVi2JGPBROArANCJCmoFtZh2qAnSubh-iSVjzY_EcJGYdkHDzCiCN8j4nheLzrAqZmjFLlEU`
            }
        })
            .then(d => d.json())
            .then(data => {
                if(!data.segments & typeof failure === "function") {
                    return failure();
                };
                console.log(data.segments.length);
                (result => {
                    request.query.raw
                        ? (_ => {
                            response.setHeader("Content-Type", "application/json");
                            console.log(" the one");

                            response.send(result);
                        })()
                        : (_ => {
                            response.setHeader("Content-Type", "image/png");
                            draw(result)
                                .pngStream()
                                .pipe(response);
                            var out = fs.createWriteStream('./test.png')
                            var stream = draw(result).createPNGStream()
                            stream.pipe(out)
                            out.on('finish', () =>  console.log('The PNG file was created.'))
                            fs.writeFile("./out.png", result, 'base64', function(err) {
                                console.log(err);
                            });

                        })();
                })(computer(data));
            })
            .catch(fail => {
                console.log(fail);
                if (typeof failure === "function") {
                    return failure();
                }
                response.send("failure");
            })
    );
});
function draw(matrix) {
    var Canvas = require("canvas"),
        Image = Canvas.Image,
        canvas = new Canvas.Canvas(matrix.length, matrix.length),
        ctx = canvas.getContext("2d");

    matrix.forEach((row, y) => {
        row.forEach((pixel, x) => {
            //ctx.fillStyle = `rgba(29, 185, 84, ${Math.floor((1-(pixel/2.7538424065294658)) * 100)}%)`;
            //ctx.fillStyle = `hsl(113, 91.7%, ${Math.floor((1-(pixel/2.7538424065294658)) * 37.8)}%)`
            ctx.fillStyle = `hsl(113, 91.7%, ${Math.floor((1 - pixel) * 37.8)}%)`;
            ctx.fillRect(x, y, 1, 1);
        });
    });

    return canvas;
}
module.exports = router;

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect("/");
}