var zmq = require('zmq'),
 	sock = zmq.socket('pull'),
 	tasks = require('./tasks'),
 	cluster = require('cluster'),
    Task = require('./models/Task'),
    Test = require('./models/Test'),
    mongoose = require('mongoose');

//mongoose.connect('mongodb://prataksha:thesis@46.101.192.224:27017/woorati');
mongoose.connect('localhost/woorati');
/*
if (cluster.isMaster) {
 	var clusterWorkerSize = require('os').cpus().length;
    for (var i = 0; i < clusterWorkerSize; i++) {
        cluster.fork();
    }
} else  {*/
	sock.on('message', function(msg){
        console.log("pulled a message");
		var task = JSON.parse(msg.toString());
		var domain = require('domain').create();
        domain.on('error', function(err){
            if(err) throw err;
        });
        domain.run(function(){
        	Task.findById(task._id, function(err, task) {
        		if(err) throw err;
        		if(task) {
        			Task.populate(task, {path: 'test'}, function(err, task) {
	                	if(err) throw err;
	        			if(task.status === "active") {
                            console.log("task "+task._id+" is active! of test "+task.test.protocol_prefixed_url);
                            tasks.performTask(task);
                        }
					});
        		}
        	});
        });
	});
	var pusher = "127.0.0.1:3000";
	sock.connect('tcp://'+pusher);
	console.log('Worker connected to '+pusher);
//}

