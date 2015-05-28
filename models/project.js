/**
 * Created by Glenn on 13-4-2015.
 */
var mongoose = require('mongoose');


var projectSchema = mongoose.Schema({
    name: String,
    code : String,
    description: String,
    collaborators : [String],
    leader: String,
    startDate: Date,
    deadline: Date,
    standardStates: [String],
    uniqueLinks: [String]
});
var Project = mongoose.model('Project', projectSchema);
module.exports.Project = Project;
