var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var freetestsSchema = new Schema({
	ip: String,
	created: { type: Date, default: Date.now },
	test: {
		type: Schema.ObjectId,
		ref: 'tests'
	},
	user: {
		type: Schema.ObjectId,
		ref: 'users'
	}
});

module.exports = mongoose.model('freetests', freetestsSchema);