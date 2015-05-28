/**
 * Created by Glenn on 13-4-2015.
 */
var async = require('async');
var config = require('./../config.json');
var projectService = require('././projectService');
var errorHandler = require('./../response/errorHandler');
var userService = require('././userService');
var auth = require('././authenticationService');
var notifications = require('././notificationService');

exports.registerRoutes = function(app) {
    app.post('/project/create', createProject, makeNewNotifications);
    app.get('/project/getprojects', getProjects);
    app.get('/project/getproject', getProject);
    app.del('/project/delete', deleteProject);
    app.put('/project/update', updateProject, makeUpdateNotification);
    app.put('/project/changeleader', changeLeader, makeChangeLeaderNotification);
    app.get('/project/membersDesc', getMembersDesc);
    app.get('/project/members', getMembers)
};

function createProject(req, res, next) {
    async.waterfall([
        function (callback) {
            auth.verifyToken(req.params.token, callback);
        },
        function (userId, callback) {
            projectService.createProject(req.params, userId, callback);
        },
        function(project, callback) {
            userService.findCollaborators(req.params.collaborators, function(err, usersExists) {
                callback(err, project, usersExists);
            });
        },
        function (project, usersExist, callback) {
            projectService.checkAndAddCollabs(project, usersExist, callback)
        }
    ], function(err, result) {
        var response = errorHandler.handleProjectErrors(err, result);
        res.send(response);
        req.project = result[result.length - 1];
        return next();
    });
}

function getProjects(req, res, next) {
    async.waterfall([
        function(callback) {
            auth.verifyToken(req.params.token, callback);
        },
        function(userId, callback) {
            projectService.getProjects(userId, callback);
        }
    ], function(err, result) {
        var response = errorHandler.handleResult(err, result, 'Projects fetched.');
        res.send(response);
    });
    next();
}

function updateProject(req, res, next) {
    async.waterfall([
        function(callback) {
            auth.verifyToken(req.params.token, callback)
        },
        function(userId, callback) {
            async.series([
                function(callback) {
                    projectService.getProjectDesc(req.params._id, userId, callback);
                },
                function(callback) {
                    projectService.updateProject(userId, req.params, callback)
                }
            ], callback)
        },
        function (results, callback) {
            req.oldProject = results[0];
            var project = results[1];
            req.oldCollaborators = project.collaborators;
            userService.findCollaborators(req.params.collaborators, function(err, userExists) {
                callback(err, project, userExists)
            });
        },
        function(project, userExists, callback) {
            projectService.checkAndAddCollabs(project, userExists, callback);
        },
        function(result, callback) {
            projectService.processUpdate(result, callback);
        }
    ], function(err, result) {
        var response = errorHandler.handleProjectErrors(err, result, 'Projects updated successfully.');
        res.send(response);
        req.project = result[result.length - 1];
        return next();
    });
}

function getProject(req, res, next) {
    async.waterfall([
        function(callback) {
            auth.verifyToken(req.params.token, callback);
        },
        function(userId, callback) {
            projectService.getProject(req.params.projectId, userId, callback);
        }
    ], function(err, result) {
        var response = errorHandler.handleResult(err, { project: result }, 'Project fetched successfully.');
        res.send(response);
    });
    next();
}

function deleteProject(req, res, next) {
    async.waterfall([
        function(callback) {
            auth.verifyToken(req.params.token, callback);
        },
        function (userId, callback) {
            projectService.deleteProject(req.params.projectId, userId, callback);
        }
    ], function(err, result) {
        if(!result) err = new Error('You have no right to delete the project');
        var response = errorHandler.handleResult(err, {}, 'Project has been deleted.');
        res.send(response);
    });
    next();
}

function changeLeader(req, res, next) {
    async.waterfall([
        function(callback) {
            auth.verifyToken(req.params.token, callback);
        },
        function(userId, callback) {
            projectService.changeLeader(req.params, userId, callback);
        }
    ], function(err, result) {
        var response = errorHandler.handleResult(err, result, 'You are no longer leader of this project.');
        res.send(response);
        req.project = result;
        return next();
    });
}

function getMembersDesc(req, res, next) {
    async.waterfall([
        function(callback) {
            auth.verifyToken(req.params.token, callback)
        },
        function(userId, callback) {
            projectService.getMembersDesc(req.params.projectId, userId, callback);
        }
    ], function(err, members) {
        res.send(errorHandler.handleResult(err, { members : members }, 'members fetched.'));
    })
}

function getMembers(req, res, next) {
    async.waterfall([
        function(callback) {
            auth.verifyToken(req.params.token, callback)
        },
        function(userId, callback) {
            projectService.getMembers(req.params.projectId, userId, callback);
        }
    ], function(err, members) {
        res.send(errorHandler.handleResult(err, { members : members }, 'members fetched.'));
    })
}

function makeUpdateNotification(req, res, next) {
    var oldCollabs = req.oldCollaborators, project = req.project;
    notifications.makeUpdateProjectNotifications(req.oldProject, oldCollabs, project);
}

function makeNewNotifications(req, res, next) {
    notifications.makeNewProjectNotifications(req.project);
}

function makeChangeLeaderNotification(req, res, next) {
    notifications.makeChangeLeaderNotification(req.project);
}