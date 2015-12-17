// define our lobby schema for mongoose
var mongoose = require('mongoose');

var lobbySchema = mongoose.Schema({
    name: String,
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    timeout: Date
});

// TODO some kind of method to remove this lobby after a certain amount of ms

module.exports = mongoose.model('Lobby', lobbySchema);
