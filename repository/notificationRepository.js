/**
 * Created by Glenn on 8-5-2015.
 */
var mongoose = require('mongoose');
Notification = mongoose.model('Notification');

exports.create = function(notification, callback) {
    var newNotification = new Notification({
        subjectDescriptor: notification.subjectDescriptor,
        description: notification.description,
        timeStamp: notification.timeStamp,
        type: notification.type,
        subjectType: notification.subjectType
    });
    newNotification.save(function(err, notification) {
        callback(err, notification);
    })
};

exports.find = function(condition, callback) {
    Notification.find(condition).lean().exec(callback);
};

exports.findLimit = function(condition, limit, callback) {
    Notification.find(condition).sort({timeStamp:-1}).limit(limit).lean().exec(callback);
};