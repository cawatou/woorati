var express = require('express'), 
    app = express(),
    cors = require('cors'),
    mongoose = require('mongoose'),
    routes = require('./routes'),
    Task = require('./models/Task'),
    Test = require('./models/Test'),
    Credential = require('./models/Credential'),
    User = require('./models/User'),
    bcrypt = require('bcrypt-nodejs'),
    cookieParser = require('cookie-parser'),
    cluster = require('cluster');

//mongoose.connect('mongodb://prataksha:thesis@localhost/woorati');
mongoose.connect('mongodb://localhost/woorati');

var bodyParser = require('body-parser');
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({extended: true})); // to support URL-encoded bodies

var authenticate = require("authenticate");
app.use(authenticate.middleware({
    encrypt_key: "woorati", // Add any key for encrypting data
    validate_key: "thesis" // Add any key for signing data
}));

app.use(cookieParser());

app.get('/get_lang', routes.get_language);
app.post('/register', routes.registration);
app.get('/confirm/:user_id', routes.confirmation);
app.get('/user', routes.user);
app.post('/login', routes.login);
app.get('/go', routes.go);
app.get('/find_meta', routes.find_meta);
app.use('/', express.static(__dirname + '/WOORATI'));
app.get('/test/:test_id', routes.testResult);
app.get('/export/test/:test_id', routes.pdfReport);
app.post('/subscription', routes.subscribe);
var port = 8000;
app.listen(port, function() {
    console.log("Server listening at port " + port);
});


function reset_tasks_in_db() {
	Task.find({status: "active"}, function(err, tasks) {
		if(err) throw err;
		var date_ms = Date.parse(new Date());
		tasks.forEach(function(task){
			task.status = "failed";
			var tasks_time_taken = date_ms - task.updated;
			if(tasks_time_taken >= task.ttl) {
				task.updated = date_ms;
				task.save(function(err) {
					if(err) throw err;
					console.log("on boot: ", task._id, " failed TTL exceeded!");
				});
			}
		});
	});
}

//restarting tasks
    reset_tasks_in_db();
    require('./scheduler');
