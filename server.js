#!/usr/bin/env node

var express = require('express');
var mongoose = require('mongoose');
var randomString = require('randomstring');

var app = express();
var PORT_NUMBER = 3000;

// connect to the database
mongoose.connect('mongodb://localhost/lets-meet');
var Lobby = require('./schemas/lobby');
var User = require('./schemas/user');

// get our credentials
var mailer = require('./config/node-mailer.js');

// create a new lobby and respond with lobby name
app.post('/startlobby/:userId/:lat/:lng', function(req, res) {
    findUserById(req.params.userId, function(user) { // find user by id
        var lobbyName = randomString.generate(50); // create lobby name
        user.save(function(err) {
            if (err) return console.error(err);
            var lobby = new Lobby({
                creator: user._id, // the creator of this lobby
                name: lobbyName, // lobby name
                users: [user] // add this user to the array
            });
            // TODO set expiration time!
            lobby.save(function(err, lobby) { // save this lobby
                if (err) return console.error(err);
                console.log('User: \'%s\' with id: %s creating new lobby: %s', user.username, user._id, lobby);
                Lobby
                    .findOne(lobby) // create a new query
                    .populate('users') // populate userId array with referenced docs
                    .exec(function(err, lobby) {
                        if (err) return console.error(err);
                        res.send(lobby);
                    });
            });
        });
    });
});

app.post('/addUser/:username/:email/:lat/:lng', function(req, res) {
    var user = new User({
        username: req.params.username,
        email: req.params.email,
        latitude: req.params.lat,
        longitude: req.params.lng
    });
    user.save(function(err, user) {
        if (err) return console.error(err);
        console.log('Added user: ' + user);
        res.send(user); // respond with user id, save id in SharedPrefs
        // send a mail to notify ourselfs of new users!
        var mUserName = user.username;
        if (mUserName.match(/n6|i9100|stofstik/gi) === null) {
            sendMail('Added user ' + mUserName + ' to database');
        }

    });
});


app.post('/updateUser/:userId/:username/:email/:lat/:lng', function(req, res) {
    User.findByIdAndUpdate(
        req.params.userId, // find User by id
        { // update params
            username: req.params.username,
            email: req.params.email,
            latitude: req.params.lat,
            longitude: req.params.lng
        }, {
            safe: true,
            upsert: false,
            new: true
        }, // some options
        // upsert: ensure exists, new: return updated object
        function(err, model) {
            if (err) {
                res.send('' + err);
                console.error(err);
            } else {
                console.log('User %s updating: name: %s, lat: %s, lng: %s',
                    model._id, model.username, model.latitude, model.longitude);
                res.send(model);
            }
        });

});

// TODO notify of new user?
app.post('/joinlobby/:name/:userId', function(req, res) {
    findLobby(req.params.name, function(lobby) {
        findUserById(req.params.userId, function(user) {
            addUserToLobby(lobby, user, function(err, model) {
                console.log('Adding user %s to lobby %s', user.username, lobby.name);
                Lobby
                    .findOne(model) // create a new query
                    .populate('users') // populate userId array with referenced docs
                    .exec(function(err, lobby) {
                        if (err) return console.error(err);
                        res.send(lobby);
                    });

                // TODO get location from users in current lobby
            });
        });
    });
});

// TODO needs some thought
// TODO notify other users we have left!
app.post('/exitlobby/:name/:userId', function(req, res) {
    findLobby(req.params.name, function(lobby) {
        findUserById(req.params.userId, function(user) {
            removeUserFromLobby(lobby, user, function(err, model) {
                console.log('Removing user %s from lobby %s', user.username, lobby.name);
                res.send(model);
            });
        });
    });
});

app.post('/getlobby/:name/:userId', function(req, res) {
    // TODO respond with all users in this lobby
    // TODO only respond if this is a user in our database CHECK
    // TODO only respond when this userId is in the lobby CHECK
    // TODO food for thought
    console.log("User %s requesting lobby: %s", req.params.userId, req.params.name);
    findLobby(req.params.name, function(lobby) { // find the lobby
        findUserById(req.params.userId, function(user) { // find the user
            // check if user exists in this lobby
            var userId = user._id; // string representation of id
            var userExists = lobby.users.some(function(user) {
                return user.equals(userId);
            });
            if (userExists) {
                // the user exists in this lobby, respond with locations
                Lobby
                    .findOne(lobby) // create a new query
                    .populate('users') // populate userId array with referenced docs
                    .exec(function(err, lobby) {
                        if (err) return console.error(err);
                        res.send(lobby);
                    });
            }
        });
    });
});

// TODO error checking if lobby doesnt exist
function findLobby(lobbyName, callback) {
    Lobby.find({
        name: lobbyName
    }, function(err, lobbies) { // TODO use findOne?
        if (err) return console.error(err);
        if (lobbies.length > 0) {
            // we have found a lobby with this name
            callback(lobbies[0]);
        }
    });
}

// TODO error checking if user doesnt exist
function findUserById(userId, callback) {
    User.findById(userId, function(err, userDoc) {
        if (err) return console.error(err);
        // we have found a user with this name
        callback(userDoc);
    });
}

function addUserToLobby(lobby, user, callback) {
    // TODO check if user is already in lobby! Notify accordingly
    Lobby.findByIdAndUpdate(
        lobby._id, // find lobby by this id
        {
            $addToSet: {
                users: user._id
            }
        }, // add this user to the user array only if it does not exist!
        {
            safe: true,
            upsert: false,
            new: true
        }, // some options
        // upsert: ensure exists, new: return updated object
        function(err, model) {
            callback(err, model);
        });
}

function removeUserFromLobby(lobby, user, callback) {
    Lobby.findByIdAndUpdate(
        lobby._id, {
            $pull: {
                users: user._id
            }
        }, {
            safe: true,
            upsert: false,
            new: true
        }, // some options
        // upsert: ensure exists, new: return updated object
        function(err, model) {
            callback(err, model);
        });
}

function sendMail(text) {
    var mailOptions = {
        from: 'node-mailer <verstegen.daan@gmail.com', // sender address
        to: 'verstegen.daan@gmail.com', // list of receivers
        subject: 'Sup bruh!', // Subject line
        text: text // plaintext body
    };
    mailer.transporter.sendMail(mailOptions, function(err, info) {
        if (err) return console.error(err);
        console.log(info.response);
    });
}

// TODO Use mongodb Users collection
// TODO Send user his unique id on connection	CHECK
// TODO Add User reference to Lobby.users[] 	CHECK
// TODO User extracted methods in /joinmeet
// TODO Meeting point entry in lobby schema
// TODO Update User location					CHECK


// start the server
var server = app.listen(PORT_NUMBER, function() {
    var host = server.address().address;
    var port = server.address().port;

    console.log('listening at %s:%s', host, port);
});
