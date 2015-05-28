/**
 * Created by Glenn on 27-4-2015.
 */
var mongoose = require('mongoose');
var async = require('async');
Task = mongoose.model('Task');

exports.getTaskIdentifier = function (boardId, callback) {
    Task.find({boardId: boardId}).select('identifier').lean().exec(callback);
};

exports.create = function(task, callback) {
    var newTask = new Task({
        title: task.title,
        description : task.description,
        boardId: task.boardId,
        projectId: task.projectId,
        creator : task.creator,
        identifier: task.identifier,
        important: task.important,
        deadline: task.deadline,
        state: task.state,
        assignee: task.assignee
    });
    newTask.save(callback);
};

exports.findTasks = function(condition, callback) {
    Task.find(condition).lean().exec(callback);
};

exports.findTask = function(condition, callback) {
    Task.findOne(condition).lean().exec(callback);
};

exports.findOneAndUpdate = function(condition, task, callback) {
    Task.findOneAndUpdate(condition, task, {new: true}).lean().exec(callback);
};

exports.addComment = function(taskId, comment, callback) {
    async.waterfall([
        function(callback) {
            Task.findOne({_id: taskId}, callback)
        },
        function(task, callback) {
            task.comments.push(comment);
            task.save(callback);
        }
    ], function(err, newTask) {
        async.detect(newTask.comments,
            function(item, callback) {
                callback(item.timeStamp == comment.timeStamp && item.comment == comment.comment && item.userId == comment.userId);
            },
            function(result) {
                newTask = result.toObject();
            });
        callback(err, newTask);
    });
};

exports.deleteComment = function deleteComment(task, comment, callback) {
    Task.findOne({ _id: task._id}, function(err, task) {
        task.comments.id(comment._id).remove();
        task.save(callback);
    });
};

exports.updateComment = function(comment, callback) {
    Task.findOneAndUpdate({"comments._id": comment._id}, { $set: { "comments.$": comment } },{ new: true }).lean().exec(callback);
};

exports.getTaskCount = function(condition, callback) {
    Task.count(condition, callback)
};

exports.deleteMany = function(condition, callback) {
    Task.find(condition).remove().exec(callback)
};

exports.updateMany = function(condition, update, callback) {
    Task.update(condition, update, { multi: true }, callback);
};