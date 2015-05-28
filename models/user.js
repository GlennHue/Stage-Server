/**
 * Created by Glenn on 13-4-2015.
 */
var mongoose = require('mongoose');


var userSchema = mongoose.Schema({
    username: String,
    password: String,
    email: String,
    salt: String,
    firstname: String,
    lastname: String,
    imageUrl: String,
    recovery: {
        uuid: String,
        date: Date
    }
});
var User = mongoose.model('User', userSchema);
module.exports.User = User;
