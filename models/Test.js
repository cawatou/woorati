var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var testsSchema = new Schema({
	url: String,
	created: { type: Date, default: Date.now },
	protocol_prefixed_url: String,
	user: {
		type: Schema.ObjectId,
		ref: 'users'
	},
	email: String
});

module.exports = mongoose.model('tests', testsSchema);