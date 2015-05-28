/**
 * Created by Glenn on 8-5-2015.
 */
var auth = require('./../service/authenticationService');
var notificationService = require('./../service/notificationService');
var errorHandler = require('./../response/errorHandler');

exports.registerRoutes = function(app) {
    app.get('/notifications/user',getUserFromToken, getNotificationsByUser);
    app.get('/notifications/board', getUserFromToken, getNotificationsByBoard);
};

function getUserFromToken(req, res, next) {
    auth.verifyToken(req.params.token, function(err, userId) {
        req.userId = userId;
        next(err);
    })
}

function getNotificationsByUser(req, res, next) {
    notificationService.getNotificationsByUserId(req.userId, req.params.limit, req.params.timeStamp, function(err, result) {
        res.send(errorHandler.handleResult(err, {notifications: result}, 'notifications fetched'));
    });
}

function getNotificationsByBoard(req, res, next) {
    notificationService.getNotificationsByBoard(req.params.boardId, req.params.limit, req.userId, function(err, result) {
        res.send(errorHandler.handleResult(err, {notifications: result}, 'notifications fetched'));
    })
}

