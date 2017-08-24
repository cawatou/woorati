var zmq = require('zmq'),
	sock = zmq.socket('push'),
	Task = require('./models/Task'),
    Test = require('./models/Test');

sock.bindSync('tcp://127.0.0.1:3000');
console.log('Producer bound to port 3000');

var task_delegator = function() {
	Task.find({$or: [{status: "inactive"}, {status: "failed"}]}, function(err, tasks) {
        if(err) throw err;
        if(tasks.length > 0) {
            Task.populate(tasks, {path: 'test'}, function(err, tasks) {
                if(err) throw err;
                tasks.forEach(function(task, index) {
                	task.status = "active";
	            	task.updated = Date.parse(new Date()); 
					task.save(function(err) {
					    if(err) throw err;
					    sock.send(JSON.stringify(task));
					    console.log("task ", task.name, " #", task._id, " pushed!");
					    setTimeout(function() {
					    	task_ttl_check(task);
					    }, task.ttl);
					    if(tasks.length-1 === index) {
					        setTimeout(task_delegator, 2000);
					    }		
		        	});
                });
            }); 
        } else {
            setTimeout(task_delegator, 2000);
        }
    });
};

task_delegator();

function task_ttl_check(data) {
	Task.findById(data._id, function(err, task) {
		if(err) throw err;
		if(task) {
			if(task.status === "active") {
				task.status = "failed";
				task.save(function(err) {
					if(err) throw err;
					console.log(task._id, "failed TTL exceeded!");
				});
			}
		}
	});
}