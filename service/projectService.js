/**
 * Created by Glenn on 13-4-2015.
 */
var projectValidator = require('././projectValidator');
var projectRepo = require('./../repository/projectRepository');
var mailService = require('./mailService');
var config = require('./../config.json');
var async = require('async');
var uuid = require('node-uuid');
var _ = require('underscore');
var boardService = require('./boardService');
var userService = require('./userService');
var notifications = require('./notificationService');

exports.createProject = function (params, userId, callback) {
    var messages = projectValidator.validateNewProject(params);
    if (messages.length !== undefined && messages.length !== 0) {
        callback(new Error('mult'), messages);
    } else {
        var code = params.code;
        var newProject = filterProject(params);
        newProject.leader = userId;
        newProject.code = code;
        newProject.startDate = new Date();
        async.waterfall([
            function (callback) {
                projectRepo.create(newProject, callback)
            },
            function (project, callback) {
                var defaultBoard = getDefaultBoard(project.standardStates, project.deadline, project._id);
                boardService.createBoard(defaultBoard, userId, function(err, board) {
                    callback(err, project);
                });
            }
        ], callback);
    }
};

exports.checkAndAddCollabs = function (project, usersExist, callback) {
    var tasks = [];
    usersExist.forEach(function (entry) {
        if (!entry.exists) {
            if (entry.email !== undefined) { // this is an email that does not exist in our db, we will send an invitation email.
                tasks.push(function (cb) {
                    var uId = uuid.v1();
                    var link = config.domain + config.registerPath + entry.email + '/' + uId;
                    project.uniqueLinks = project.uniqueLinks || [];
                    project.uniqueLinks.push(uId);
                    projectRepo.findOneAndUpdate(project._id, project);
                    mailService.inviteCoworkers(entry.email, link, cb);
                });
            } else { //this is a string that is not a valid email address, the system will assume the user entered a username which is not in our db and will sent an appropriate WARN message.
                tasks.push(function (cb) {
                    var message =  {};
                    message.message = {code: 'WARN', message: entry.message};
                    cb(null, message);
                });
            }
        } else { //the user exists, callback with the required data.
            tasks.push(function (cb) {
                cb(null, {add: entry.user._id, projectId: project._id, leader: project.leader});
            });
        }
    });
    async.parallel(tasks, function (err, results) {
        var users = []; // this will contain all the existing users which will be added to the project
        var projectId = '';
        var leaderEntry = {}, toDelete= [];
        results.forEach(function(entry, index, arr) {
            results.forEach(function(entry2, index2) {
                if(entry2.add!=undefined && index != index2 && entry2.add.equals(entry.add)) {
                    arr.splice(index, 1);
                }
            });
        });
        results.forEach(function (entry) {
            if (entry.add != undefined) { // this is a user that exists
                if (entry.add != entry.leader) { // add to the users array
                    //
                    users.push(entry.add);
                    projectId = entry.projectId; //set the projectId, will be the same value for every entry that has 'add' property
                } else {//leader tried to add himself as a collaborator, this is not possible.
                    leaderEntry = entry;
                    results.push({message: {code: 'WARN', message: 'You cannot add yourself to a project you own.'}});
                }
            }
        });
        async.filter(results, function (item, callback) {
            callback(item !== leaderEntry)
        }, function (filteredResults) {
            results = filteredResults;
        });
        results = results.filter(onlyUnique);
        if (users.length > 0) {
            addCollab(projectId, users, function (err, result) {
                results.push(result);
                callback(err, results);
            })
        } else {
            results.push(project);
            callback(null, results);
        }
    });
};

exports.getProjects = function (userId, callback) {
    async.parallel([
        function (callback) {
            getMyProjects(userId, callback);
        },
        function (callback) {
            getOtherProjects(userId, callback);
        }
    ], function (err, results) {
        var result = {
            myProjects: results[0],
            otherProjects: results[1]
        };
        callback(err, result);
    })
};

exports.getProject = function (projectId, userId, callback) {
    async.waterfall([
        function (callback) {
            checkProject(projectId, userId, callback);
        },
        function (project, callback) {
            populateProject(project, callback);
        }
    ], callback);
};

exports.deleteProject = function (projectId, userId, callback) {
    async.series([
        function(callback) {
            projectRepo.deleteProject({_id: projectId, leader: userId}, callback);
        },
        function(callback) {
            boardService.deleteByProjectId(projectId, callback)
        }
    ], callback)
};

exports.updateProject = function (userId, params, callback) {
    var messages = projectValidator.validateNewProject(params);
    if(messages.length>0) callback(messages);
    isLeader(params._id, userId, function (err, isLeader) {
        if (isLeader) {
            params = _.omit(params, 'collaborators'); // collaborators will be added later
            projectRepo.findOneAndUpdate(params._id, filterProject(params), function (err, result) {
                callback(err, result);
            });
        } else {
            err = err || new Error('You cannot update a project you do not own.');
            callback(err);
        }
    });
};

exports.changeLeader = function (params, leaderId, callback) {
    async.waterfall([
        function (callback) {
            isLeader(params.projectId, leaderId, callback);
        },
        function (project, callback) {
            if (!project) callback(new Error('You cannot promote someone to leader if you are not the leader.'));
            else {
                project.leader = project.collaborators.splice(project.collaborators.indexOf(params.userId), 1)[0];
                project.collaborators.push(leaderId);
                projectRepo.findOneAndUpdate({_id: params.projectId}, project, callback);
            }
        },
        function (project, callback) {
            populateProject(project, callback);
        }
    ], callback);
};

exports.addRegisteredCollab = function (userId, projectId, callback) {
    projectRepo.findProject({uniqueLinks: projectId}, function (err, project) {
        if (project == undefined) {
            var error = new Error('project does not exist');
            error.code = "WARN";
            callback(error);
        } else {
            project.collaborators.push(userId);
            projectRepo.findOneAndUpdate(project._id, project, callback);
            notifications.makeJoinNotification(project, userId);
        }
    });
};

exports.isLeader = function (projectId, userId, callback) {
    isLeader(projectId, userId, callback);
};

exports.processUpdate = function (result, callback) {
    var project = {};
    result.forEach(function (entry) {
        if (entry.description != undefined) {
            project = entry;
        }
    });
    populateProject(project, function (err, pProject) {
        result[result.length - 1] = pProject;
        callback(err, result);
    });
};

exports.getProjectDesc = function (projectId, userId, callback) {
    checkProject(projectId, userId, callback);
};

exports.getParentProject = function (board, userId, callback) {
    var select = "name code collaborators leader startDate deadline";
    async.waterfall([
        function (callback) {
            projectRepo.selectProject({_id: board.projectId}, select, callback);
        },
        function (project, callback) {
            userService.getUsersFromProject(project, callback);
        }
    ], callback);
};

exports.checkAuthority = function (projectId, userId, callback) {
    projectRepo.findProject({_id: projectId}, function (err, project) {
        callback(err, userInProject(project, userId));
    });
};

exports.getMembersDesc = function (projectId, userId, callback) {
    getMembersDesc(projectId, userId, callback);
};

exports.getMembers = function (projectId, userId, callback) {
    async.waterfall([
        function (callback) {
            getMembersDesc(projectId, userId, callback);
        },
        function (members, callback) {
            var tasks = [];
            members.forEach(function (entry) {
                tasks.push(
                    function (callback) {
                        userService.findUser(entry, callback);
                    }
                );
            });
            async.parallel(tasks, callback);
        }
    ], callback);
};

exports.getProjectCode = function (projectId, callback) {
    var select = 'code';
    projectRepo.selectProject({_id: projectId}, select, callback);
};

function getMembersDesc(projectId, userId, callback) {
    var select = "leader collaborators";
    projectRepo.selectProject({_id: projectId}, select, function (err, project) {
        if (userInProject(project, userId)) {
            var result = project.collaborators;
            result.push(project.leader);
            callback(err, result)
        } else {
            callback(new Error('You are not a member of the project.'));
        }
    });
}

function getMyProjects(userId, callback) {
    projectRepo.findProjects({leader: userId}, callback);
}

function getOtherProjects(userId, callback) {
    projectRepo.findProjects({collaborators: userId}, callback);
}

function userInProject(project, userId) {
    return project.leader == userId || project.collaborators.indexOf(userId) > -1;
}

function addCollab(projectId, users, callback) {
    projectRepo.addCollab(projectId, users, callback);
}

function checkProject(projectId, userId, callback) {
    projectRepo.findProject({_id: projectId}, function (err, project) {
        if (userInProject(project, userId)) {
            callback(err, project);
        } else {
            callback(new Error('You have no rights to see this project.'));
        }
    });
}


function isLeader(projectId, userId, callback) {
    projectRepo.findProject({_id: projectId}, function (err, project) {
        if (project == undefined) {
            callback(new Error('project does not exist'))
        } else if (project.leader == userId) {
            callback(err, project);
        } else {
            callback(err, false);
        }
    });
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

function getDefaultBoard(states, deadline, projectId) {
    var board = {
        name: 'General',
        description: 'General tasks of the project.',
        deadline: deadline,
        projectId: projectId,
        states: states
    };
    return board;
}

function populateProject(project, callback) {
    async.parallel([
        function (callback) {
            userService.getUsersFromProject(project, callback);
        },
        function (callback) {
            boardService.getBoards(project._id, callback);
        }
    ], function (err, result) {
        project = result[0];
        boardService.convertStates(result[1], function(err, boards) {
            project.boards = boards;
            callback(err, project);
        })
    });
}

function filterProject(project) {
    return _.pick(project, ['name', 'description', 'collaborators', 'leader', 'deadline', 'standardStates'])
}

exports.getProjectAsLeader = function (projectId, userId, callback) {
    projectRepo.findProject({_id: projectId}, function (err, project) {
        if (project.leader == userId) callback(err, project);
        else callback(new Error('You are not the leader of the project.'));
    });
};