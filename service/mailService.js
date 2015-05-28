/**
 * Created by Glenn on 8-4-2015.
 */
var nodemailer = require('nodemailer');
var config = require('./../config.json');
var async = require('async');
var fileHandler = require('./../handler/fileHandler');

var transport = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: config.email,
        pass: config.password
    }
});

exports.sendRecoveryMail = function (to, link, cb) {
    var html =
        '<div style="text-align: center; width: 300px; height: 600px; font-family: Helvetica Neue, Helvetica, Arial, sans-serift;">'+
        '<img src="cid:logo@myapp" alt="logo" style=" width: 300px; height: 100px" />'+
        '<p>We\'ve received a request to reset your collaboration account password.</p>'+
        '<p><a href="' + link + '"><button style="height: 40px; width: 150px; color: #fff; background-color: #337ab7; border-color: #2e6da4">Reset password</button></a></p>'+
        '<p>Password reset links are valid for only 24 hours. If the link expires, you will need to submit a new request.</p>'+
        '<p>If you didn\'t request a change, please disregard this e-mail and your password will stay the same.</p>'+
        '</div>';
    var attachments = [
        {
            filename: config.logo,
            path: config.imagePath + config.logo,
            cid: 'logo@myapp'
        }
    ];
    var mailOptions = makeMailOptions('noreply@collab.be', to, 'Password recovery', html, attachments);
    transport.sendMail(mailOptions, function (err, info) {
        if (err) cb(err);
        cb(null, info);
    });
};

exports.inviteCoworkers = function (to, link, cb) {
        var html =
            '<div style="text-align: center; width: 300px; height: 600px; font-family: Helvetica Neue, Helvetica, Arial, sans-serift;">'+
            '<img src="cid:logo@myapp" alt="logo" style=" width: 300px; height: 100px" />'+
            '<p><h3>HIVE5 will help you manage your projects!</h3></p>'+
            '<p>A coworker has invited you to join!</p>'+
            '<p>In the collaboration app you can work together on projects with your friends or coworkers.</p>'+
            '<p>You can also create and manage your own projects for free! Start collaborating now.</p>'+
            '<a href="' + link + '"><button style="height: 40px; width: 150px; color: #fff; background-color: #337ab7; border-color: #2e6da4">Get started</button></a>'+
            '</div>';
        var attachments = [
            {
                filename: config.logo,
                path: config.imagePath + config.logo,
                cid: 'logo@myapp'
            }
        ];
        var mailOptions = makeMailOptions('noreply@collab.be', to, 'Join the team!', html, attachments);
        transport.sendMail(mailOptions, cb);
};

function makeMailOptions(from, to, subject, text, attachments) {
    return {from: from, to: to, subject: subject, html: text, attachments: attachments};
}
