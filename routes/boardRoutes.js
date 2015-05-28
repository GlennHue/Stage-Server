/**
 * Created by Glenn on 21-4-2015.
 */
var async = require('async');
var auth = require('././authenticationService');
var errorHandler = require('./../response/errorHandler');
var boardService = require('././boardService');
var notifications = require('././notificationService');

exports.registerRoutes = function (app) {
    app.post('/board/create', createBoard, makeCreateBoardNotification);
    app.get('/board', getBoard);
    app.put('/board', updateBoard, makeUpdateBoardNotification);
    app.del('/board', deleteBoard);
    app.get('/boardsdescriptor', getBoards);
};

function createBoard(req, res, next) {
    async.waterfall([
        function (callback) {
            auth.verifyToken(req.params.token, callback)
        },
        function(userId, callback) {
            req.userId = userId;
            boardService.createBoard(req.params, userId, callback);
        }
    ], function (err, result) {
        req.board = result;
        result = errorHandler.handleMMResult(err, {board: result}, result.messages, 'The ' + result.name + ' board was created for your project.');
        res.send(result);
        return next();
    });
}

function getBoard(req, res, next) {
    async.waterfall([
        function(callback) {
            auth.verifyToken(req.params.token, callback);
        },
        function(userId, callback) {
            boardService.getBoard(req.params.boardId, userId, callback);
        }
    ], function(err, board) {
        var result = errorHandler.handleResult(err, { board: board }, 'Board fetched.');
        res.send(result);
    });
}

function updateBoard(req, res, next) {
    async.waterfall([
        function (callback) {
            async.parallel([
                function(callback) {
                    auth.verifyToken(req.params.token, callback)
                },
                function(callback) {
                    boardService.getBoardById(req.params._id, callback);
                }
            ], callback)
        },
        function (results, callback) {
            req.userId = results[0];
            req.oldBoard = results[1];
            boardService.updateBoard(req.params, results[0], callback);
        }
    ], function (err, board) {
        req.newBoard = board;
        var result = errorHandler.handleResult(err, {board: board}, 'Board updated.');
        res.send(result);
        return next();
    });
}

function deleteBoard(req, res, next) {
    async.waterfall([
        function (callback) {
            auth.verifyToken(req.params.token, callback)
        },
        function(userId, callback) {
            boardService.delete(req.params._id, req.params.projectId, userId, callback);
        }
    ], function (err, result) {
        result = errorHandler.handleResult(err, null, 'Board deleted.');
        res.send(result);
    });
}

function getBoards(req, res, next) {
    async.waterfall([
        function(callback) {
            auth.verifyToken(req.params.token, callback);
        },
        function(userId, callback) {
            boardService.getBoardsDesc(req.params.projectId, userId, callback);
        }
    ], function(err, result) {
        res.send(errorHandler.handleResult(err, { boards: result }, 'Boards fetched'));
    })
}

function makeCreateBoardNotification(req, res, next) {
    notifications.makeCreateBoardNotification(req.board, req.userId);
}

function makeUpdateBoardNotification(req, res, next) {
    notifications.makeUpdateBoardNotification(req.oldBoard, req.newBoard, req.userId);
}