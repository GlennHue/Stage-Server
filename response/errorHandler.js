/**
 * Created by Glenn on 14-4-2015.
 */
var resultFact = require('./resultFactory');

exports.handleProjectErrors = function (err, results) {
    var result;
    var usersAddedCounter = 0, emailsSentCounter = 0;
    var messages = [];
    var project = {};
    if (err &&err.message == 'mult') {
        result = resultFact.makeFailureMultipleMessages(results)
    }else if(err) {
        result = resultFact.makeFailureResult('ERROR', err.message);
    } else {
        results.forEach(function (entry) {
            if (entry.add !== undefined) { //this means 1 user was added to the project.
                usersAddedCounter++;
            } else if (entry.message !== undefined ) {//this is a user not found
                messages.push(entry.message);
            } else if (entry.description !== undefined) {
                project = entry;
            } else {//this is an email
                emailsSentCounter++;
            }
        });
        var message;
        if(emailsSentCounter !== 0) {
            message = emailsSentCounter==1 ? ' email has been sent.': ' emails have been sent.';
            messages.push({code: 'INFO', message: emailsSentCounter + message})
        }
        if(usersAddedCounter !== 0) {
            message = usersAddedCounter==1 ? 'Your project has 1 collaborator' : ' Your project now has ' + usersAddedCounter + ' collaborators.';
            messages.push({code: 'INFO', message: message})
        }
        result = resultFact.makeSuccessMMResult(messages, {project : project});
    }
    return result;
};

exports.handleResult = function(err, result, message) {
    if(err && err.code == 'WARN') {
        resultFact.makeSuccessMMResult([err, {code: "INFO", message: message}], result)
    } else if(err) {
        result = resultFact.makeFailureResult('ERROR', err.message);
    } else {
        result = resultFact.makeSuccessResult(message, result);
    }
    return result;
};

exports.handleMMResult = function(err, result, messages, successMessage) {
    if(err) {
        result = resultFact.makeFailureResult('ERROR', err.message);
    } else if(messages != null && messages.length > 0) {
        result = resultFact.makeFailureMultipleMessages(messages);
    } else {
        result = resultFact.makeSuccessResult(successMessage, result);
    }
    return result;
};

exports.handleUser = function(err, user, token) {
    var result;
    if(err) {
        result = resultFact.makeFailureResult('ERROR', err.message);
    } else {
        var data = makeUserData(user);
        if(token) {
            data.token = token;
        }
        result = resultFact.makeSuccessResult('User logged in successfully.', data);
    }
    return result;
};

exports.makeUserData = function (user) {
    return makeUserData(user);
};

function makeUserData(user) {
    user = user || {};
    var userResult = {};
    userResult.user = user;
    userResult.user.role = 'user';
    return userResult;
}