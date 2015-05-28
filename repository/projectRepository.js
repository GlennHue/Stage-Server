var mongoose = require('mongoose');

Project = mongoose.model('Project');

exports.create = function (project, cb) {
    var newProject = new Project ({
        name: project.name,
        description: project.description,
        leader: project.leader,
        startDate: project.startDate,
        deadline: project.deadline,
        standardStates: project.standardStates,
        code: project.code.toUpperCase()
    });
    newProject.save(function(err, result, number) {
        cb(err, result);
    });
};

exports.addCollab = function(projectId, users, cb) {
    Project.findOne({_id : projectId}).lean().exec(function(err, project) {
        project.collaborators = users;
        Project.findOneAndUpdate({_id : project._id}, project, {new : true}).lean().exec(cb);
    });
};

exports.findProjects = function(condition, callback) {
    Project.find(condition).lean().exec(callback);
};

exports.findProject = function(condition, callback) {
    Project.findOne(condition).lean().exec(callback);
};

exports.deleteProject = function(condition, callback) {
    Project.findOneAndRemove(condition, function (err, result) {
        if(result) callback(err, result);
        else callback(new Error('You are not the leader of this project, you cannot delete it.'));
    });
};

exports.findOneAndUpdate = function(id, project, callback) {
    Project.findOneAndUpdate({_id : id}, project, { new:true}).lean().exec(callback);
};

exports.selectProject = function(conditionm, select, callback) {
    Project.findOne(conditionm).select(select).lean().exec(callback);
};