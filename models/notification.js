/**
 * Created by Glenn on 8-5-2015.
 */
var mongoose = require('mongoose');


var notificationSchema = mongoose.Schema({
    subjectDescriptor: {
        taskId: String,
        projectId: String,
        boardId: String,
        userId: String
    },
    description: String,
    timeStamp: Date,
    type: String,
    subjectType: String
});
var Notification = mongoose.model('Notification', notificationSchema);
module.exports.Notification = Notification;