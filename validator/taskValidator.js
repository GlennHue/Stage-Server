/**
 * Created by Glenn on 24-4-2015.
 */

exports.validateNewTask = function(task, states) {
    var messages = [];
    if(task.title != undefined && !validateString(task.title, 2, 40)) {
        messages.push(makeMessage('title', 2, 40));
    }
    if(task.description != undefined && !validateString(task.description, 2, 1000)) {
        messages.push(makeMessage('description', 2, 1000));
    }
    if(task.important != undefined &&!task.important instanceof Boolean) {
        messages.push({code : 'ERROR', message:'Important needs to be a true or false value.'});
    }
    if(task.state != undefined && states != null && states.states.indexOf(task.state) == -1) {
        messages.push({code:'ERROR', message:'State needs to be one of the task\'s board states'});
    }
    return messages;
};

function validateString(string, minLength, maxLength){
    return string.length >= minLength && string.length <= maxLength;
}

function makeMessage(wrong, minlength, maxlength) {
    return { code : 'ERROR', message : wrong + ' needs to be between ' + minlength + ' and ' + maxlength + 'characters long.'};
}