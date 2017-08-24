var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var usersSchema = new Schema({
	name: String,
	avatar: String,
	status: String, //paid or unpaid
	created: { type: Date, default: Date.now },
	email: String,
	phone: String,
	customer_id: String,
	subscription_left: Number
});

module.exports = mongoose.model('users', usersSchema);