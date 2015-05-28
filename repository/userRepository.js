/**
 * Created by Glenn on 31-3-2015.
 */
var mongoose = require('mongoose');
var config = require('./../config.json');

User = mongoose.model('User');

exports.registerUser = function (user, callback) {
    var registeredUser = new User({
        username: user.username,
        password: user.password,
        salt: user.salt,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        imageUrl: config.imageUrl + config.defaultImage,
        recovery: {}
    });
    registeredUser.save(function(err, user) {
        callback(err, user.toObject());
    });
};

exports.userExists = function (condition, cb) {
    User.find(condition, function (err, users) {
        if (err) cb(err);
        cb(null, users.length >= 1);
    });
};

exports.findUser = function(condition, cb) {
    User.findOne(condition).lean().exec(function(err, user) {
        if(err) cb(err);
        cb(null, user);
    });
};

exports.findUserById = function(id, cb) {
    User.findOne({_id: id}).lean().exec(function(err, user) {
        if(err) cb(err);
        cb(null, user);
    });
};

exports.findOneAndUpdate = function(id, update, cb) {
    User.findOneAndUpdate({_id: id}, update, {new: true}).lean().exec(function (err, user) {
        if(err) cb(err);
        if(user == null) {
            cb(new Error('No such User'));
        }
        cb(null, user);
    });
};

exports.findUserByEmail = function(email, cb) {
    User.findOne({email : email}).lean().exec(function (err, user) {
        if(err) {
            cb(err);
        } else {
            cb(null, user);
        }
    });
};

exports.findUserByUuid = function(uuid, cb) {
    User.findOne({'recovery.uuid': uuid}).exec(function(err, user) {
        if(err) cb(err);
        if(user != null && user.recovery.date > new Date()) {
            user.recovery = undefined;
            user.save(function(err, user) {
                if(err) cb(err);
                cb(null, user);
            });
        } else {
            cb(new Error('You clicked an invalid link.'))
        }
    });
};

exports.selectUser = function(condition, select, callback) {
    User.findOne(condition).select(select).lean().exec(callback);
};

exports.findUsers = function (condition, cb) {
    User.find(condition).limit(10).lean().exec(cb);
};
