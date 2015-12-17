var nodemailer = require('nodemailer');
var authData = require('./config/authData.js');

var mailer = module.exports = {};

mailer.transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: authData.username,
        pass: authData.password
    }
});
