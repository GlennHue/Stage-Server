/**
 * Created by Glenn on 2-4-2015.
 */
var md5 = require('./../encryption/md5');
var salt = require('./../encryption/salt');
var userRepo = require('./../repository/userRepository');
var authService = require('./authenticationService');
var _ = require('underscore');
var fileHandler = require('./../handler/fileHandler');
var uuid = require('node-uuid');
var validator = require('././userValidator');
var async = require('async');
var config = require('./../config.json');


/**
 *
 * @param user
 * @param callback = function(err, messages, success) if messages is an object the server will send an error response with all the messages inside this object.
 */
exports.registerUser = function (user, callback) {
    var messages = validator.validateRegistration(user);
    if (messages.length === 0) {
        async.series([
            function (callback) {
                async.parallel([
                    function (callback) {
                        userRepo.userExists({username: new RegExp(user.username, 'i')}, callback);
                    },
                    function (callback) {
                        userRepo.userExists({email: new RegExp(user.email, 'i')}, callback);
                    }
                ], function (err, results) { // results will always be an array of 2 booleans.
                    if (results[0] || results[1]) {
                        var message = results[0] ? 'Username already exists.' : 'A user has already registered using this email.';
                        callback(new Error(message));
                    } else callback();
                });
            },
            function (callback) {
                var saltStr = salt.getSalt(user.password, ''); //empty string because the function will build the salt from scratch
                user.password = encryptPassword(user.password, saltStr);
                user.salt = saltStr;
                userRepo.registerUser(user, callback);
            }
        ], function (err, results) {
            callback(err, results[1])
        });
    } else {
        callback(messages);
    }
};

/**
 *
 * @param credentials
 * @param callback = function(err, token, user) token is a json web token for session management, user is a user object who is now logged in.
 */
exports.loginUser = function (credentials, callback) {
    userRepo.findUser({username: credentials.username}, function (err, user) {
        if (user != null && validateUser(credentials.password, user.salt, user.password)) {
            var token = authService.issueToken(user._id);
            callback(null, token, filterUser(user));
        } else {
            callback(new Error('Username or password are incorrect.'));
        }
    });
};


/**
 *
 * @param params
 * @param calback
 */
exports.updateUser = function (params, calback) {
    var messages = validator.validateUpdate(params);
    if (messages.length === undefined) {
        authService.verifyToken(params.token, function (err, decoded) {
            if (err) calback(err);
            userRepo.findUserById(decoded, function (err, user) {
                userRepo.userExists({email: params.email}, function (err, exists) {
                    if (user.email == params.email) {
                        exists = false;
                    }
                    if (err) calback(err);
                    if (exists) {
                        calback(new Error('A user has already registered using this email.'));
                    } else {
                        if (params.newPassword != undefined) {
                            params.oldPassword = params.oldPassword || '';
                            if (validateUser(params.oldPassword, user.salt, user.password)) {
                                params.password = encryptPassword(params.newPassword, user.salt);
                                userRepo.findOneAndUpdate(decoded, params, function (err, user) {
                                    if (err) calback(err);
                                    var filteredUser = filterUser(user);
                                    calback(null, null, filteredUser);
                                });
                            } else {
                                calback(new Error('Your password was incorrect, no changes have been made.'));
                            }
                        } else {
                            userRepo.findOneAndUpdate(decoded, params, function (err, user) {
                                if (err) calback(err);
                                var filteredUser = filterUser(user);
                                calback(null, null, filteredUser);
                            });
                        }
                    }
                });
            });
        })
    } else {
        calback(null, messages);
    }
};

exports.upload = function (req, callback) {
    var token = req.params.data;
    var uid = uuid.v1();
    async.waterfall([
        function(callback) {
            authService.verifyToken(token, callback);
        },
        function(userId, callback) {
            userRepo.findUserById(userId, callback)
        },
        function(user, callback) {
            async.series([
                function(callback) {
                    fileHandler.createFile(req.files.file, uid, callback);
                },
                function(callback) {
                    fileHandler.deleteFile(user, callback);
                }
            ], function(err, results) {
                callback(err, results[0], user);
            });
        },
        function(ext, user, callback) {
            userRepo.findOneAndUpdate(user._id, {imageUrl: config.imageUrl + uid + ext}, callback);
        }
    ], function(err, result) {
        callback(err, filterUser(result));
    })
};

exports.getUserFromToken = function (token, callback) {
    authService.verifyToken(token, function (err, decoded) {
        if (err) callback(err);
        userRepo.findUserById(decoded, function (err, user) {
            if (err)callback(err);
            callback(null, filterUser(user));
        })
    })
};

exports.resetPassword = function (params, callback) {
    userRepo.findUserByEmail(params.email, function (err, user) {
        if (err) callback(err);
        if (user == null) {
            callback(new Error('There is no user registered with that email.'));
        } else {
            var tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            var uId = uuid.v1();
            var recovery = {
                recovery: {
                    date: tomorrow,
                    uuid: uId
                }
            };
            if (user.recovery != undefined) {
                if (user.recovery.date < new Date()) {
                    user.recovery = undefined;
                } else {
                    callback(null, user.email, user.recovery.uuid);
                    return;
                }
            }
            userRepo.findOneAndUpdate(user._id, recovery, function (err, user) {
                if (err) callback(err);
                callback(null, user.email, user.recovery.uuid);
            });
        }
    });
};

exports.confirmReset = function (params, callback) {
    if (validator.validateChangedPassword(params.newPassword)) {
        userRepo.findUserByUuid(params.uuid, function (err, user) {
            if (err) callback(err);
            else {
                var encryptedPW = encryptPassword(params.newPassword, user.salt);
                userRepo.findOneAndUpdate(user._id, {password: encryptedPW}, function (err, updatedUser) {
                    if (err) callback(err);
                    callback(null, filterUser(updatedUser));
                });
            }
        });
    } else {
        callback(new Error('The provided password is not valid.'))
    }
};

exports.userExists = function (params, callback) {
    var username = params.username || '';
    var email = params.email || '';
    if (username.length > 2) {
        userRepo.userExists({username: username}, callback);
    }
    if (email.length > 5) {
        userRepo.userExists({email: email}, callback);
    }
};

exports.confirmEmails = function (emails, callback) {
    var vEmails = [];
    var number = 0;
    var asyncTasks = [];
    emails.forEach(function (entry) {
        asyncTasks.push(function (cb) {
            userRepo.userExists(entry, cb);
        });
    });
    async.parallel(asyncTasks, function (err, result) {
        var counter = 0;
        result.forEach(function (exists) {
            if (!exists) {
                vEmails.push(emails[counter].email);
                number++;
            }
            counter++;
        });
        callback(null, vEmails, number);
    });
};

exports.findCollaborators = function (users, callback) {
    var tasks = [];
    users.forEach(function (entry) {
        if (entry instanceof String && entry.indexOf("@") > -1) {
            tasks.push(function (cb) {
                userRepo.findUserByEmail(entry, cb);
            });
        } else {
            tasks.push(function (cb) {
                userRepo.findUser({username: entry}, cb);
            });
        }
    });
    async.parallel(tasks, function (err, results) {
        var counter = 0;
        var result = [];
        results.forEach(function (entry) {
            if (entry == null) {
                if (users[counter] instanceof String && users[counter].indexOf("@") > -1) {
                    result.push({exists: false, email: users[counter]});
                } else {
                    result.push({exists: false, message: users[counter] + ' does not exist'});
                }
            } else {
                result.push({exists: true, user: entry});
            }
            counter++;
        });
        callback(err, result);
    });
};

exports.findALike = function (username, callback) {
    if (username.length >= 2) {
        var temp = username.split(' ');
        var firstname, lastname;
        if (temp.length > 1) {
            async.parallel([
                function(callback) {
                    var tempCopy = temp;
                    firstname = tempCopy.shift(); lastname = tempCopy.toString().replace(/,/g, ' ');
                    findUsers({firstname: firstname, lastname: lastname}, callback);
                },
                function(callback) {
                    firstname = temp.pop(); lastname = temp.toString.replace(/,/g, ' ');
                    findUsers({firstname: firstname, lastname: lastname}, callback)
                }
            ], function(err, results) {
                var arr = results[0].concat(results[1]);
                var uniqueArr = uniqueUserArray(arr);
                callback(err, uniqueArr)
            });
        } else {
            async.parallel([
                function(callback) {
                    findUsers({username: new RegExp(username, 'i')}, callback);
                },
                function(callback) {
                    findUsers({firstname: new RegExp(username, 'i')}, callback);
                },
                function(callback) {
                    findUsers({lastname: new RegExp(username, 'i')}, callback);
                }
            ], function(err, results) {
                var arr = results[0].concat(results[1]).concat(results[2]);
                var uniqueArr = uniqueUserArray(arr);
                callback(err, uniqueArr);
            })
        }
    } else {
        callback(new Error('Please query using more than 1 character.'));
    }
};

exports.getUsersFromProject = function (project, callback) {
    var select = '_id username firstname lastname imageUrl';
    var tasks = [
        function (cb) {
            userRepo.selectUser({_id: project.leader}, select, cb)
        }
    ];
    project.collaborators.forEach(function (entry) {
        tasks.push(function (cb) {
            userRepo.selectUser({_id: entry}, select, cb);
        });
    });
    async.parallel(tasks, function (err, results) {
        var leader = results.shift();
        project.leader = filterName(leader);
        project.collaborators = [];
        results.forEach(function (entry) {
            project.collaborators.push(filterName(entry));
        });
        callback(err, project);
    })
};

exports.findUser = function (userId, callback) {
    userRepo.findUser({_id: userId}, function (err, user) {
        callback(err, filterUser(user));
    });
};

exports.sortResults = function (userId, projects, users, callback) {
    users.forEach(function (user, index, theUsers) {
        theUsers[index].value = 0;
        projects.myProjects.forEach(function (project) {
            if (project.collaborators.length > 0 && project.collaborators.indexOf(user._id > -1)) {
                theUsers[index].value += 1;
            }
        });
        projects.otherProjects.forEach(function (project) {
            if ((project.collaborators.length > 0 && project.collaborators.indexOf(user._id > -1) || project.leader == user._id)) {
                theUsers[index].value += 1;
            }
        })
    });
    async.sortBy(users, function (item, callback) {
        callback(null, item.value);
    }, function (err, result) {
        callback(err, result);
    });
};

exports.populateTasks = function (tasks, callback) {
    var taskArray = [];
    tasks.forEach(function (task) {
        taskArray.push(
            function (callback) {
                populateTask(task, callback);
            }
        )
    });
    async.parallel(taskArray, callback);
};

exports.populateTask = function (task, callback) {
    populateTask(task, callback);
};

exports.populateComment = function (comment, callback) {
    populateComment(comment, callback);
};

function populateComment(comment, callback) {
    var select = '_id username firstname lastname imageUrl';
    userRepo.selectUser({_id: comment.userId}, select, function (err, user) {
        comment.user = user;
        callback(err, _.omit(comment, 'userId'));
    });
}

function populateTask(task, callback) {
    var select = '_id username firstname lastname imageUrl';
    async.parallel([
        function (callback) {
            userRepo.selectUser({_id: task.creator}, select, callback);
        },
        function (callback) {
            userRepo.selectUser({_id: task.assignee}, select, callback);
        },
        function (callback) {
            populateComments(task.comments, callback);
        }
    ], function (err, results) {
        task.creator = results[0];
        task.assignee = results[1];
        task.comments = results[2];
        callback(err, task);
    })
}

function populateComments(comments, callback) {
    var tasks = [];
    comments.forEach(function (comment) {
        tasks.push(function (callback) {
            populateComment(comment, callback);
        })
    });
    async.parallel(tasks, callback);
}

function filterName(user) {
    user.name = user.firstname + ' ' + user.lastname;
    return _.omit(user, ['firstname', 'lastname']);
}

function filterUser(user) {
    return _.omit(user, ['password', 'salt', '__v', 'recovery']);
}

function filterUsers(users) {
    if (users.length == 0) {
        return users;
    }
    var user = filterUser(users.splice(0, 1)[0]);
    var newUsers = filterUsers(users);
    newUsers.push(user);
    return newUsers;
}

function validateUser(submittedPassword, salt, password) {
    var encryptedPassword = encryptPassword(submittedPassword, salt);
    return encryptedPassword === password;
}

function encryptPassword(password, salt) {
    return md5.md5(password + salt);
}

function filterNewUser(user) {
    _.pick(user, ['_id', 'firstname', 'lastname', ''])
}

function findUsers(condition, callback) {
    userRepo.findUsers(condition, function(err, users) {
        callback(err, filterUsers(users));
    });
}

function uniqueUserArray(arr) {
    var uniqueArr =[];
    arr.forEach(function(user) {
        var temp = null;
        uniqueArr.forEach(function(uniqueUser) {
            if(uniqueUser.email == user.email) {
                temp = filterName(uniqueUser);
            }
        });
        if (temp == null)uniqueArr.push(user);
    });
    return uniqueArr;
}