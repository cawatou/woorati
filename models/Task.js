var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var tasksSchema = new Schema({
	name: String,
	status: String,
	value: String,
	ttl: Number,
	updated: Number,
	weight: Number,
	priority: String,
	test: {
		type: Schema.ObjectId,
		ref: 'tests'
	}
});

module.exports = mongoose.model('tasks', tasksSchema);