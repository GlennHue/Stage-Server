/**
 * Created by Glenn on 24-4-2015.
 */
var async = require('async');
var auth = require('./../service/authenticationService');
var validator = require('./../validator/taskValidator');
var taskService = require('./../service/taskService');
var errorHandler = require('./../response/errorHandler');
var notifications = require('./../service/notificationService');

exports.registerRoutes = function(app) {
    app.post('/task/create', createTask, makeCreateTaskNotification);
    app.get('/task', getTask);
    app.post('/task/comment', postComment);
    app.put('/task', updateTask, makeUpdateTaskNotification);
    app.get('/tasks', getTasks);
    app.put('/task/comment', updateComment);
    app.del('/task/comment', deleteComment);
    app.put('/task/switchboard', switchBoard);
    app.put('/task/changestate', changeState, makeUpdateTaskNotification)
};

function createTask(req, res, next) {
    var task = req.params.task;
    async.waterfall([
        function(callback) {
            auth.verifyToken(req.params.token, callback);
        },
        function(userId, callback) {
            req.userId = userId;
            taskService.createTask(task, userId, callback);
        }
    ], function(err, task) {
        req.task = task;
        res.send(errorHandler.handleResult(err, { task: task }, 'A new task was created.'));
        return next();
    });
}

function getTask(req, res, next) {
    async.waterfall([
        function(callback) {
            auth.verifyToken(req.params.token, callback);
        },
        function(userId, callback) {
            taskService.getTask(req.params._id, userId, callback);
        }
    ], function(err, result) {
        res.send(errorHandler.handleResult(err, result, 'Task fetched.'));
    })
}

function postComment(req, res, next) {
    async.waterfall([
        function(callback) {
            auth.verifyToken(req.params.token, callback);
        },
        function(userId, callback) {
            taskService.postComment(req.params._id, userId, req.params.comment, callback);
        }
    ], function(err, result) {
        res.send(errorHandler.handleResult(err, {comment:result}, 'Comment added to task.'));
    })
}

function updateTask(req, res, next) {
    async.waterfall([
        function(callback) {
            async.parallel([
                function(callback) {
                    auth.verifyToken(req.params.token, callback)
                },
                function(callback) {
                    taskService.getTaskById(req.params.task._id, callback)
                }
            ], callback)
        },
        function(results, callback) {
            req.userId = results[0]; req.oldTask = results[1];
            taskService.updateTask(results[1], req.params.task, results[0], callback);
        }
    ], function(err, task) {
        req.newTask = task;
        res.send(errorHandler.handleResult(err, { task: task }, 'Task updated.'));
        return next();
    });
}

function getTasks(req, res, next) {
    async.waterfall([
        function(callback) {
            auth.verifyToken(req.params.token, callback);
        },
        function(userId, callback) {
            taskService.getTasks(req.params.projectId, userId, callback);
        }
    ], function(err, tasks) {
        res.send(errorHandler.handleResult(err, { tasks: tasks }, tasks.length + ' tasks fetched.'));
    })
}

function updateComment(req, res, next) {
    async.waterfall([
        function (callback) {
            auth.verifyToken(req.params.token, callback);
        },
        function (userId, callback) {
            taskService.updateComment(req.params.comment, userId, callback);
        }
    ], function(err, result) {
        res.send(errorHandler.handleResult(err, { comment: result }, 'Comment changed.'));
    })
}

function deleteComment(req, res, next) {
    async.waterfall([
        function(callback) {
            auth.verifyToken(req.params.token, callback);
        },
        function(userId, callback) {
            taskService.deleteComment(req.params.commentId, userId, callback);
        }
    ], function(err) {
        res.send(errorHandler.handleResult(err, null, 'Comment deleted.'));
    })
}

function switchBoard(req, res, next) {
    async.waterfall([
        function(callback) {
            auth.verifyToken(req.params.token, callback)
        },
        function(userId, callnack) {
            taskService.switchBoard(req.params.task, userId, callnack);
        }
    ], function(err, board) {
        res.send(errorHandler.handleResult(err, {}, 'Task was moved to ' + board.name + ' board.' ));
    })
}

function makeCreateTaskNotification(req, res, next) {
    notifications.makeCreateTaskNotification(req.task, req.userId);
}

function makeUpdateTaskNotification(req, res, next) {
    notifications.makeUpdateTaskNotification(req.oldTask, req.newTask, req.userId);
}

function changeState(req, res, next) {
    var oldState;
    async.waterfall([
        function(callback) {
            async.parallel([
                function(callback) {
                    auth.verifyToken(req.params.token, callback);
                },
                function(callback) {
                    taskService.getTaskById(req.params.task._id, callback)
                }
            ], function(err, result) {
                oldState = result[1].state;
                req.userId = result[0];
                req.oldTask = result[1];
                callback(err, result);
            })
        },
        function(results, callback) {
            taskService.changeState(results[0], results[1], req.params.task, callback)
        }
    ],function(err, task) {
        req.oldTask.state = oldState;
        req.newTask = task;
        res.send(errorHandler.handleResult(err, { task: task }, 'Task updated.'));
        return next();
    })
}