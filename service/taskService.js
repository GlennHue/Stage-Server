/**
 * Created by Glenn on 27-4-2015.
 */
var async = require('async');
var taskRepo = require('./../repository/taskRepository');
var validator = require('./../validator/taskValidator');
var userService = require('./userService');
var boardService = require('./boardService');
var projectService = require('./projectService');
var _ = require('underscore');
var notifications = require('./notificationService');

function getTaskIdentifier(boards, callback) {
    var tasks = [];
    boards.forEach(function (board) {
        tasks.push(function (callback) {
            taskRepo.getTaskIdentifier(board._id, callback);
        });
    });
    async.parallel(tasks, function (err, result) {
        var number = 1;
        result.forEach(function (identifier) {
            identifier.forEach(function (entry) {
                if (entry.identifier.length > 0) {
                    var iNumber = entry.identifier.split('-')[1];
                    if (iNumber >= number) {
                        number = parseInt(iNumber) + 1;
                    }
                }
            });
        });
        callback(err, number);
    });
}

exports.populateBoard = function (board, callback) {
    async.waterfall([
        function (callback) {
            taskRepo.findTasks({boardId: board._id}, callback);
        },
        function (tasks, callback) {
            userService.populateTasks(tasks, callback)
        }
    ], function (err, result) {
        board.tasks = result;
        callback(err, board);
    })

};

exports.createTask = function (task, userId, callback) {
    var messages = validator.validateNewTask(task);
    if (messages.length > 0) callback(messages);
    else {
        async.waterfall([
            function (callback) {
                async.parallel([
                    function (callback) {
                        projectService.checkAuthority(task.projectId, userId, callback);
                    },
                    function (callback) {
                        projectService.checkAuthority(task.projectId, task.assignee, callback);
                    }
                ], callback)
            },
            function (authorized, callback) {
                if (!authorized[0]) callback(new Error('You are not a member of this project, you cannot create tasks.'));
                else if (!authorized[1]) callback(new Error('Assignee must be a member of the project'));
                else boardService.getBoardById(task.boardId, callback);
            },
            function (board, callback) {
                task.creator = userId;
                task.state = board.states[0];
                boardService.getBoards(board.projectId, callback)
            },
            function (boards, callback) {
                async.parallel([
                    function (callback) {
                        getTaskIdentifier(boards, callback);
                    },
                    function (callback) {
                        projectService.getProjectCode(boards[0].projectId, callback);
                    }
                ], callback);
            },
            function (results, callback) {
                var number = results[0], code = results[1].code;
                task.identifier = code + '-' + number;
                taskRepo.create(task, function (err, task, number) {
                    callback(err, task.toObject());
                });
            },
            function (task, callback) {
                userService.populateTask(task, callback);
            }
        ], callback);
    }
};

exports.postComment = function (taskId, userId, comment, callback) {
    async.waterfall([
        function (callback) {
            taskRepo.findTask({_id: taskId}, callback);
        },
        function (task, callback) {
            boardService.checkAuthority(task, userId, callback)
        },
        function (authorized, callback) {
            if (!authorized) callback(new Error('You are not a member of this project, you can\'t comment on it'));
            else createComment(taskId, userId, comment, callback);
        },
        function (comment, callback) {
            userService.populateComment(comment, callback);
        }
    ], callback);
};

exports.getTask = function (taskId, userId, callback) {
    async.waterfall([
        function (callback) {
            taskRepo.findTask({_id: taskId}, callback);
        },
        function (task, callback) {
            boardService.checkAuthority(task, userId, function (err, authorized) {
                if (authorized) callback(err, task);
                else callback(new Error('Not authorized to see this task'));
            });
        },
        function (task, callback) {
            async.parallel([
                function (callback) {
                    boardService.getStates(task.boardId, callback);
                },
                function (callback) {
                    userService.populateTask(task, callback);
                }
            ], function (err, results) {
                callback(err, {boardStates: results[0].states, task: results[1]})
            });
        }
    ], callback);
};

exports.updateTask = function (oldTask, task, userId, callback) {
    task = filterTask(task);
    if (oldTask.creator == userId || oldTask.assignee == userId) {
        boardService.getStates(oldTask.boardId, function (err, states) {
            var messages = validator.validateNewTask(task, states);
            if (messages.length > 0) callback(messages);
            else {
                async.waterfall([
                    function (callback) {
                        taskRepo.findOneAndUpdate({_id: task._id}, task, callback);
                    },
                    function (task, callback) {
                        userService.populateTask(task, callback);
                    }
                ], callback)
            }
        });
    } else callback(new Error('You can not edit this task.'));
};

exports.getTasks = function (projectId, userId, callback) {
    async.waterfall([
        function (callback) {
            projectService.checkAuthority(projectId, userId, callback)
        },
        function (authorized, callback) {
            if (authorized) {
                taskRepo.findTasks({projectId: projectId}, callback);
            }
        },
        function (tasks, callback) {
            userService.populateTasks(tasks, callback);
        }
    ], callback)
};

exports.deleteComment = function (commentId, userId, callback) {
    async.waterfall([
        function (callback) {
            taskRepo.findTask({"comments._id": commentId}, callback);
        },
        function (task, callback) {
            if (!task) callback(new Error('No such comment'));
            else {
                var comment = null;
                async.detect(task.comments,
                    function (item, callback) {
                        callback(item._id == commentId);
                    },
                    function (result) {
                        comment = result;
                    });
                if (userId == task.creator || comment.userId == userId) {
                    taskRepo.deleteComment(task, comment, callback);
                } else callback(new Error("You do not have the right to remove this comment."));
            }
        }
    ], callback);

};

exports.updateComment = function (comment, userId, callback) {
    async.waterfall([
        function (callback) {
            taskRepo.findTask({"comments._id": comment._id}, callback)
        },
        function (task, callback) {
            if (!task) callback(new Error('No such comment'));
            else {
                var newComment = {};
                async.detect(task.comments,
                    function (item, callback) {
                        callback(item._id == comment._id);
                    },
                    function (result) {
                        newComment = result;
                        newComment.comment = comment.comment;
                        newComment.timeStamp = new Date();
                    });
                if (newComment.userId == userId) {
                    taskRepo.updateComment(newComment, function (err) {
                        callback(err, newComment)
                    });
                } else callback(new Error("You do not have the right to edit this comment."));
            }
        }, function (newComment, callback) {
            userService.populateComment(newComment, callback);
        }
    ], callback);
};

exports.getTaskCount = function (boardId, state, callback) {
    taskRepo.getTaskCount({boardId: boardId, state: state}, callback);
};

exports.switchBoard = function (newTask, userId, callback) {
    async.waterfall([
        function (callback) {
            async.waterfall([
                function (callback) {
                    taskRepo.findTask({_id: newTask._id}, callback);
                },
                function (task, callback) {
                    boardService.getBoardById(newTask.boardId, function (err, board) {
                        var results = [task, board];
                        callback(err, results);
                    });
                }
            ], callback)
        },
        function (results, callback) {
            var task = results[0], board = results[1];
            var update = {};
            projectService.checkAuthority(task.projectId, userId, function(err, authorized) {
                if(authorized) {
                    notifications.makeSwitchBoardNotification(task, newTask.boardId, userId);
                    update.boardId = newTask.boardId;
                    update.state = board.states[0];
                    taskRepo.findOneAndUpdate({_id: newTask._id}, update, function (err, task) {
                        callback(err, board);
                    });
                }  else callback(new Error('You do not have the right to change this task.'));
            });
        }
    ], callback);
};

exports.getTaskById = function (id, callback) {
    taskRepo.findTask({_id: id}, callback);
};

exports.deleteByProjectId = function (projectId, callback) {
    taskRepo.deleteMany({projectId: projectId}, callback)
};

exports.deleteByBoardId = function (boardId, callback) {
    taskRepo.deleteMany({boardId: boardId}, callback);
};

exports.updateTaskStates = function (boardId, oldState, newState, callback) {
    taskRepo.updateMany({boardId: boardId, state: oldState}, {state: newState}, callback)
};

exports.changeState = function(userId, oldTask, task, callback) {
    async.waterfall([
        function(callback) {
            async.parallel([
                function(callback) {
                    projectService.checkAuthority(oldTask.projectId, userId, callback);
                },
                function(callback) {
                    boardService.getStates(oldTask.boardId, callback);
                }
            ], callback)
        },
        function(results, callback) {
            if(results[0] && results[1].states.indexOf(task.state) > -1) {
                oldTask.state = task.state;
                taskRepo.findOneAndUpdate({ _id: oldTask._id }, oldTask, callback);
            } else  {
                var message = results[0] ? 'The new state of the task must be a state that exists within the board' : 'You have no rights within this project.';
                callback(new Error(message));
            }
        }, function(task, callback) {
            userService.populateTask(task, callback);
        }
    ], callback)
};

function createComment(taskId, userId, comment, callback) {
    var newComment = {
        userId: userId,
        comment: comment,
        timeStamp: new Date()
    };
    taskRepo.addComment(taskId, newComment, function (err, newComment) {
        callback(err, newComment);
    });
}

function filterTask(task) {
    return _.pick(task, ['title', 'description', 'creator', 'important', 'deadline', 'state', 'assignee', '_id']);
}