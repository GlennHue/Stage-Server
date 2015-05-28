/**
 * Created by Glenn on 21-4-2015.
 */
var mongoose = require('mongoose');


var boardSchema = mongoose.Schema({
    name: String,
    description: String,
    deadline: Date,
    projectId : String,
    states: [String]
});
var Board = mongoose.model('Board', boardSchema);
module.exports.Board = Board;