// define our user schema for mongoose
var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
	creator	 : Boolean,
	email	 : String,
	username : String,
	latitude : String,
	longitude: String
});

module.exports = mongoose.model('User', userSchema);

