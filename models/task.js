/**
 * Created by Glenn on 24-4-2015.
 */
var mongoose = require('mongoose');

var commentSchema = mongoose.Schema({
    userId: String,
    comment: String,
    timeStamp: Date
});

var taskSchema = mongoose.Schema({
    title: String,
    description : String,
    boardId: String,
    projectId: String,
    creator : String,
    identifier: String,
    important: Boolean,
    deadline: Date,
    state: String,
    assignee: String,
    comments: [commentSchema]
});
var Task = mongoose.model('Task', taskSchema);
module.exports.Task = Task;
