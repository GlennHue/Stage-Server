/**
 * Created by Glenn on 30-3-2015.
 */


var restify = require('restify');
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/AgCollab');
userSchema = require('./models/user').User;
projectSchema = require('./models/project').Project;
boardSchema = require('./models/board').Board;
taskSchema = require('./models/task').Task;
notificationSchema = require('./models/notification').Notification;
mongoose.model('User', userSchema);
mongoose.model('Project', projectSchema);
mongoose.model('Board', boardSchema);
mongoose.model('Task', taskSchema);
mongoose.model('Notification', notificationSchema);

var app = restify.createServer();
var userRoutes = require('./routes/userRoutes');
var projectRoutes = require('./routes/projectRoutes');
var boardRoutes = require('./routes/boardRoutes');
var taskRoutes = require('./routes/taskRoutes');
var notificationRoutes = require('./routes/notificationRoutes');

app.use(restify.fullResponse());
app.use(restify.bodyParser());
app.use(restify.queryParser());

app.get(/.avatars/, restify.serveStatic({
directory: 'public',
 default: 'profilepicture.jpg'
}));

userRoutes.registerRoutes(app);
projectRoutes.registerRoutes(app);
boardRoutes.registerRoutes(app);
taskRoutes.registerRoutes(app);
notificationRoutes.registerRoutes(app);

app.on('InternalError', function (req, res, err, cb) {
    err = { success : false, messages : [{ code: 'ERROR', messages: 'Something went wrong. Please try again.' }] };
    res.send(err);
});

app.listen(6543, function() {
    console.log('%s listening at %s', app.name, app.url);
});
/*
userRoutes.registerRoutes(app);
userRoutes.registerRoutes(app);
userRoutes.registerRoutes(app);
userRoutes.registerRoutes(app);
userRoutes.registerRoutes(app);
userRoutes.registerRoutes(app);
userRoutes.registerRoutes(app);
userRoutes.registerRoutes(app);
userRoutes.registerRoutes(app);
    **/