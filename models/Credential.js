var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var credentialsSchema = new Schema({
	password: String,
	confirmation: Boolean,
	user: {
		type: Schema.ObjectId,
		ref: 'users'
	}
});

module.exports = mongoose.model('credentials', credentialsSchema);