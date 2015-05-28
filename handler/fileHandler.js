/**
 * Created by Glenn on 7-4-2015.
 */
var fs = require('fs');
var config = require('./../config.json');
var _ = require('underscore');

exports.createFile = function(file, name, callback) {
    fs.readFile(file.path, function (err, data) {
        /// If there's an error
        if(!name){
            callback(err);
        } else {
            var ext = file.name.split('.')[1];
            if(_.contains(config.supportedImages, ext)) {
                var newPath = config.imagePath + name + '.' + ext;

                /// write file to uploads folder
                fs.writeFile(newPath, data, function (err) {
                    if (err)callback(err);
                    callback(null, '.' + ext);
                });
            } else {
                callback(new Error('File type was not supported.'));
            }
        }
    });
};

exports.deleteFile = function(user, callback) {
    var imageUrl = user.imageUrl.split("/");
    var filename = imageUrl[imageUrl.length-1];
    if(filename != "profilepicture.png") {
        fs.unlink(config.imagePath + filename, callback);
    } else callback();
};

exports.getBase64Img = function(fileName, callback) {
    var fileExt = fileName.split(".");
    fileExt = fileExt[fileExt.length-1];
    fs.readFile(config.imagePath + fileName, function(err, data) {
        var base64Data = new Buffer(data).toString('base64');
        callback(err, base64Data, fileExt);
    })
};