/**
 * Created by Glenn on 13-4-2015.
 */

exports.validateNewProject = function(project) {
    var messages =  validateProjectOrBoard(project);
    if(!checkCode(project.code)) {
        messages.push(makeMessage('Code', 2, 8));
    }
    return messages;
};

exports.validateBoard = function(board) {
    return validateProjectOrBoard(board);
};

function validateProjectOrBoard(params) {
    var messages = [];
    params.standardStates = params.standardStates || params.states;
    if(!checkName(params.name)) {
        messages.push(makeMessage('Name', 2, 75));
    }
    if(!checkDesc(params.description)) {
        messages.push(makeMessage('Description', 5, 1000));
    }
    if(!checkStates(params.standardStates)) {
        messages.push(makeMessage('State', 2, 20));
    }
    return messages;
}

function checkName(name) {
    name = name || '';
    return name.length > 2 && name.length < 75;
}

function checkCode(code) {
    code = code || '';
    return code.length > 2 && code.length < 8;
}

function checkDesc(desc) {
    desc = desc || '';
    return desc.length > 4 && desc.length < 1000;
}

function checkStates(states) {
    var res = true;
    states = states || [];
    if (states.length < 1 || states.length > 10) {
        res=false;
    }
    states.forEach(function (entry) {
        if(entry.length < 2 || entry.length > 20) {
            res = false;
        }
    });
    return res;
}

function makeMessage(wrong, minlength, maxlength) {
    return { code : 'ERROR', message : wrong + ' needs to be between ' + minlength + ' and ' + maxlength + 'characters long.'};
}

