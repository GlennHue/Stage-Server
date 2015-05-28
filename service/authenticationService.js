/**
 * Created by Glenn on 3-4-2015.
 */
var jwt = require('jsonwebtoken');
var config = require('./../config.json');

exports.issueToken = function(payload) {
    var token = jwt.sign(payload, config.secret);
    return token;
};

exports.verifyToken = function(token, verified) {
    return jwt.verify(token, config.secret, verified);
};