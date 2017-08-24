var request = require('request'),
	Task = require('./models/Task'),
	Test = require('./models/Test'),
	User = require('./models/User'),
	FreeTest = require('./models/FreeTest'),
	Credential = require('./models/Credential'),
    validator = require('validator'),
    fs = require('fs'),
    bcrypt = require('bcrypt-nodejs'),
    sanitizeHtml = require('sanitize-html'),
    nodemailer = require("nodemailer"),
    authenticate = require("authenticate"),
    wkhtmltopdf = require('wkhtmltopdf'),
    cheerio = require('cheerio'),
    //html_pdf = require('html-pdf'),
    //Canvas = require('canvas'),
    //webshot = require('webshot'),
	user_agent = "Mozilla/5.0 (X11; Linux i686; rv:5.0) Gecko/20100101 Firefox/5.0",
	stripe = require("stripe")(
  		"sk_test_B5LUQbi1mehnhSb2QSIQP7ts"
	);
var smtpTransporter = nodemailer.createTransport({
	   service: "Gmail",
	   auth: {
	       user: "wooratithesis@gmail.com",
	       pass: "bachelors thesis"
	   }
});

var server_address = "http://localhost:8000";

exports.find_meta = function(req, res) {
	var query = req.query.q;
	var email = req.query.email;
	var n = 0;
	request({uri: query, method:'GET', encoding:'binary'},
    function (err, res, page) {
        //Передаём страницу в cheerio
        var $=cheerio.load(page);        
        //Идём по DOM-дереву обычными CSS-селекторами
        meta=$('meta[name^="twitter"]').each(function(){
        	n++;
        });
        var mailOptions = {
		    from: 'Woorati <woorati@woorati.com>', // sender address
		    to: email, // list of receivers
		    subject: 'Result ✔', // Subject line	    
		    html: 'meta count: ' + n
		};
		smtpTransporter.sendMail(mailOptions, function(error, info){
		    if(error) throw error;
		    console.log('Message sent!');
		}); 
    });    
}

exports.registration = function(req, res) {
	getAuthorized(req, function(err, authorized_user) {
		if(authorized_user) res.status(400).end("Sign out from current account!");
		else if (req.body.name && validator.isEmail(req.body.email) && req.body.password) {
			var name = sanitizeHtml(req.body.name), email = sanitizeHtml(req.body.email), password = req.body.password, phone = sanitizeHtml(req.body.phone);
			User.findOne({email: email}, function(err, userfound) {
				if(err) throw err;
				if(userfound) {
					res.status(400).end("Account with this email already exists!");
				} else {
					var user = new User({name: name, email: email, phone: phone, avatar: "assets/user.png", subscription_left: 0});
					bcrypt.genSalt(10, function(err, salt) {
						if(err) throw err;
						bcrypt.hash(password, salt, null, function(err, hash){
							if(err) throw err;
							user.save(function(err) {
								if(err) throw err;
								var credential = new Credential({password: hash, user: user._id, confirmation: false});
								credential.save(function(err) {
									res.end("200 OK");
									var link = server_address+"/confirm/"+user._id;
									var mailOptions = {
									    from: 'Woorati ✔ <woorati@woorati.com>', // sender address
									    to: email, // list of receivers
									    subject: 'Registration confimation ✔', // Subject line
									    //text: 'Please click the following link to confirm your registration.', // plaintext body
									    html: '<a href="'+link+'" >Click here for the confirmation</a><br><div>Thanks!<br><br><br><br>br,<br>Woorati</div>' // html body
									};
									smtpTransporter.sendMail(mailOptions, function(error, info){
									    if(error) throw error;
									    console.log('Message sent: ' + info.response, link);
									});
								});
							});
						});
					});
				}
			});	
		} else {
			res.status(400).end("Some fields are missing!");
		}
	});
};

exports.confirmation = function(req, res) {
	getAuthorized(req, function(err, authorized_user) {
		if(authorized_user) res.status(400).end("Sign out from current account!");
		else doConfirmation();
	});

	function doConfirmation() {
		Credential.findOne({user: req.params.user_id}, function(err, credential) {
			if(err) throw err;
			credential.confirmation = true;
			credential.save(function(err) {
				if(err) throw err;
				res.end("200 OK");
			});
		});
	}
};

exports.login = function(req, res) {
	var email = req.body.email, password = req.body.password;
	getAuthorized(req, function(err, authorized_user) {
		if(authorized_user) res.end(JSON.stringify(authorized_user));
		else if(email && password){
			if(validator.isEmail(email)) {
				authorize(email, password, function(err, user) {
					if(err) throw err;
					if(user) {
						res.cookie("access_token", authenticate.serializeToken(user.user_id, user.user_id));
						res.write(JSON.stringify({user: {
		                    "access_token": authenticate.serializeToken(user.user_id, user.user_id)
		                }}));
		                res.end();
					} else {
						res.status(400).end("Invalid email/password!");
					}
				});
			} else {
				res.status(400).end("Invalid email!");
			}
		} else {
			res.status(400).end("Some Fields are missing!");
		}

		function authorize(email, password, done) {
		    User.findOne({ email: email }, function(err, user) {
				if (err) return done(err); 
		      	if (!user) return done(null, false); 
		      	Credential.findOne({user: user._id}, function(err, credential) {
		      		if(err) return done(err);
		      		if(!credential) return done(null, false);
		      		if(credential.confirmation) {
		      			bcrypt.compare(password, credential.password, function(err, result) {
				        	if(err) return done(err);
				        	if(result) {
				        		return done(null, {user_id: user._id});
				        	} else {
				        		return done(null, false);
				        	}
				        });
		      		} else {
		      			return done(null, false);
		      		}
		      	});
		    });
	    }
	});
};

exports.user = function(req, res) {
	getAuthorized(req, function(err, authorized_user) {
		if(err) res.status(400).end(err);
		else if(authorized_user) {
			res.end(JSON.stringify(authorized_user));
		} else {
			res.status(400).end();
		}
	});
};

exports.testResult = function(req, res) {
	if(req.params.test_id) {
		var test_id = req.params.test_id;
		getAuthorized(req, function(err, authorized_user) {
			Test.findById(test_id, function(err, test) {
				if(err) throw err;
				Task.find({test: test._id}, function(err, tasks) {
					if(err) throw err;
					var completed = 0;
					if(tasks.length > 0) {
						var json = [], message;
						var status = 200;
						tasks.forEach(function(task) {
							if(task.status === "ready") { 
								completed ++;
								var parsedValue = JSON.parse(task.value);
								if(parsedValue instanceof Array) {
									parsedValue.forEach(function(value){
										if(value.key === 'webtest_different_location' || value.key === 'web_spider') {
											if(authorized_user) json.push(value);
										} else {
											json.push(value);
										}
									});
								} else {
									//something unexpected occured
									json.push(parsedValue);
								}
							} else {
								status = 100;
								message = "Server still processing your request!";
							}	
						});
						var total_completion = (completed/tasks.length)*100;
						total_completion = parseInt(total_completion.toFixed(0));
						var json_res = {test_id: test._id, test_url: test.url, statusCode: status, message: message, completed: total_completion, json: json};
						res.end(JSON.stringify(json_res));
					} else {
						res.status(400).end();
					}
				});
			});
		});
	} else {
		res.status(400).end();
	}
};

exports.pdfReport = function(req, res) {
	var test_id = req.params.test_id;
	if(test_id) {
		var url = server_address+"/#/testResult/"+test_id+"?fileFormat=pdf";
		var filename = __dirname+"/pdf/"+test_id+".pdf";
			
		if (fs.existsSync(filename)) {
			console.log('sending a pdf file ', filename);
	        res.sendFile(filename);
		} else {
			console.log('creating new pdf file ', filename);
			wkhtmltopdf(url, { pageSize: 'letter', output: filename }, function() {
				setTimeout(function() {
					res.sendFile(filename);
				}, 5000);
				//res.end(JSON.stringify({msg: "Oops! Server too busy! Reload again!"}));
			});
		}
		/*
        fs.stat(filename, function(err, stat) {
		    if (err) {
		        if ('ENOENT' == err.code) {
		        	console.log('creating new pdf file ', filename);
		            var stream = wkhtmltopdf('http://google.com/', { pageSize: 'letter' })
	  					.pipe(fs.createWriteStream(filename));

					var data = '';

					stream.on("data", function(buf) {
						data = data + buf.toString('base64');
					});
					stream.on("end", function(b) {
						res.header("Content-Type", "application/pdf");
						res.end(data);
					});
		        } else {
		            //it is a server error so for example send 500 to client
		            res.status(500).end();
		        }
		    } else {
		    	console.log('sending a pdf file ', filename);
		        res.sendFile(filename);
		    }
		} );*/
		
	} else {
		res.status(400).end();
	}
};

exports.get_language = function(req, res) {
	function answer(code, data) {
        res.writeHead(code,{
            'Content-Type':'application/json;charset=utf-8',
            'Access-Control-Allow-Origin':'*',
            'Access-Control-Allow-Headers':'X-Requested-With'
        });
        res.end(data);
    }

    fs.readFile('./WOORATI/' + req.query.lang + '.json', function(err, data) {
        if (err) answer(404, '');
        else answer(200, data);
    });
};

exports.subscribe = function(req, res) {
	getAuthorized(req, function(err, authorized_user) {
		if(err) res.status(400).end(err);
		else if(authorized_user) {
			if(!authorized_user.customer_id) {
				if(req.body.stripeToken) {
					stripe.customers.create({
						source: req.body.stripeToken,
						email: authorized_user.email,
						description: "Paying customer!"
					}).then(function(customer) {
						return stripe.charges.create({
						    amount: 1000, // €10  in cents, again
						    currency: "eur",
						    customer: customer.id
						});
					}).then(function(charge) {
						User.findById(authorized_user.user_id, function(err, user) {
							if(err) throw err; //this is serious
							if(user) {
								user.customer_id = charge.customer;
								authorized_user.customer_id = charge.customer;
								user.subscription_left = 10;
								user.save(function(err) {
									if(err) throw err;
									res.end(JSON.stringify({subscription_left: user.subscription_left}));
								});
							}
						});
					});
				} else {
					res.status(400).end();
				}
			} else {
				charge(req, res);
			}
		} else {
			res.status(400).end("Unauthorized!");
		}
	});
};

var charge = function(req, res) {
	getAuthorized(req, function(err, authorized_user) {
		if(err) res.status(400).end(err);
		else if(authorized_user) {
			if(authorized_user.customer_id) {
				stripe.charges.create({
					amount: 1000, // €10 in cents, again
					currency: "eur",
					customer: authorized_user.customer_id,
					description: "Charging a subscription"
				}, function(err, charge) {
					if (err && err.type === 'StripeCardError') {
					// The card has been declined
						res.status(400).end("Your card has been declined! Sorry");
					} else {
						User.findById(authorized_user.user_id, function(err, user) {
							if(err) throw err; //this is serious
							if(user) {
								user.subscription_left = user.subscription_left + 10;
								user.save(function(err) {
									if(err) throw err;
									res.end(JSON.stringify({subscription_left: user.subscription_left}));
								});
							}
						});
					}
				});
			} else {
				res.status(400).end("Please subscribe before purchasing!");
			}
		} else {
			res.status(400).end("Unauthorized");
		}
	});

};

exports.go = function(req, res) {
	//var remote_address = req.connection.remoteAddress; 
	var original_q = getDomain(req.query.q);
	if(validator.isURL(original_q, {protocols: ['http','https']})) {
		var q = add_prefix_protocol(original_q), ip = req.connection.remoteAddress, new_test = parseInt(req.query.new_test), email, query_limit;
		if(validator.isEmail(req.query.email)) email = req.query.email;
		var date_ms = Date.parse(new Date());
		var tasks = [
			{name: "last_modified", status: "inactive", ttl: 3600000, priority: "normal", updated: date_ms},
			{name: "domain_age", status: "inactive", ttl: 3600000, priority: "normal", updated: date_ms},
			{name: "smtp_ftp_mail_check", status: "inactive", ttl: 3600000, priority: "normal", updated: date_ms},
			{name: "dom_checks", status: "inactive", ttl: 3600000, priority: "normal", updated: date_ms},
			{name: "links", status: "inactive", ttl: 3600000, priority: "normal", updated: date_ms},
			{name: "main_mirror", status: "inactive", ttl: 3600000, priority: "normal", updated: date_ms},
			{name: "img_bin_data", status: "inactive", ttl: 3600000, priority: "normal", updated: date_ms},
			{name: "google_total_indexed_page", status: "inactive", ttl: 3600000, priority: "normal", updated: date_ms},
			{name: "yandex_total_indexed_page", status: "inactive", ttl: 3600000, priority: "normal", updated: date_ms},
			{name: "yandex_catalog", status: "inactive", ttl: 3600000, priority: "normal", updated: date_ms},
			{name: "yandex_snippet", status: "inactive", ttl: 3600000, priority: "normal", updated: date_ms},
			//{name: "webtest_different_location", status: "inactive", ttl: 3600000, priority: "normal", updated: date_ms},
			{name: "google_page_insight", status: "inactive", ttl: 3600000, priority: "normal", updated: date_ms},
			{name: "google_snippet_screenshot", status: "inactive", ttl: 3600000, priority: "normal", updated: date_ms},
			{name: "sitemap", status: "inactive", ttl: 3600000, priority: "normal", updated: date_ms}
			//{name: "web_spider", status: "inactive", ttl: 36000000, priority: "high", updated: date_ms}
		];
		getAuthorized(req, function(err, authorized_user) {
			var db_query = {};
			if(!authorized_user) {
				query_limit = 1000;
				db_query = {ip: ip};
			} else if(!authorized_user.customer_id){
				query_limit = 3000;
				db_query = {user: authorized_user.user_id};
			} else {
				tasks.push({name: "webtest_different_location", status: "inactive", ttl: 3600000, priority: "normal", updated: date_ms});
				tasks.push({name: "web_spider", status: "inactive", ttl: 86400000, priority: "high", updated: date_ms});
				query_limit = null;
			}
			
			var query_limit_reached = true;
			FreeTest.find(db_query).sort({'created': -1}).limit(3).exec(function(err, freeTests) {
				if(err) throw err;
				var test_query = {url: req.query.q};
				if(query_limit) {
					if(freeTests.length < query_limit) {
						query_limit_reached = false;
					} if(freeTests.length >= query_limit && query_limit === 3000) {
						var ms_1 = Date.parse(freeTests[0].created), ms_2 = Date.parse(freeTests[1].created), ms_3 = Date.parse(freeTests[2].created), 
							now_ms = Date.parse(new Date());
						if((now_ms - ms_1) > 86400000) query_limit_reached = false;
						else if((now_ms - ms_2) > 86400000) query_limit_reached = false;
						else if((now_ms - ms_3) > 86400000) query_limit_reached = false;
					}
				} else if(authorized_user.subscription_left > 0){
					query_limit_reached = false;
					test_query ={ $and: [ { url: req.query.q }, { user: authorized_user.user_id } ] };
				}
				if(!query_limit_reached) {
					Test.find(test_query).sort({_id:-1}).limit(1).exec(function(err, tests){
						if(err) throw err;
						if(tests.length === 1) {
							var test = tests[0];
							if(query_limit) {
								var freeTest;
								if(query_limit === 3000) freeTest = new FreeTest({ip: ip, test: test._id, user: authorized_user.user_id});
								else if(query_limit === 1000) freeTest = new FreeTest({ip: ip, test: test._id});
								freeTest.save(function(err) {
									if(err) throw err;
								});
								res.end(JSON.stringify({test_id: test._id, testURL: "/test/"+test._id, message: "Use the testURL to see your test result!"}));
							} else {
								if(new_test !== 1) res.end(JSON.stringify({test_id: test._id, testURL: "/test/"+test._id, message: "this is the old test analyis report.", old: true}));
								else {
									db_add_new_test({url: req.query.q, protocol_prefixed_url: q, tasks: tasks, email: email, user: authorized_user.user_id}, function(err, data) {
										if(err) throw err;
										res.end(JSON.stringify({test_id: data, testURL: "/test/"+data, message: "Use the testURL to see your test result!"}));
										User.findById(authorized_user.user_id, function(err, user) {
											if(err) throw err;
											if(user) {
												user.subscription_left = user.subscription_left - 1;
												user.save(function(err) {
													if(err) throw err;
												});
											}
										});
									});
								}
							}
						} else {
							var user_id = (authorized_user) ? authorized_user.user_id : undefined;
							db_add_new_test({url: req.query.q, protocol_prefixed_url: q, tasks: tasks, email: email, user: user_id}, function(err, data) {
								if(!err) {
									res.end(JSON.stringify({test_id: data, testURL: "/test/"+data, message: "Use the testURL to see your test result!"}));
									if(query_limit) {
										var freeTest;
										if(query_limit === 3) freeTest = new FreeTest({ip: ip, test: data, user: authorized_user.user_id});
										else if(query_limit === 1) freeTest = new FreeTest({ip: ip, test: data});
										freeTest.save(function(err) {
											if(err) throw err;
										});
									} else {
										User.findById(authorized_user.user_id, function(err, user) {
											if(err) throw err;
											if(user) {
												user.subscription_left = user.subscription_left - 1;
												user.save(function(err) {
													if(err) throw err;
												});
											}
										});
									}
								} else {
									res.status(400).end(err);
								}
							});
						}
					});
				} else {
					res.status(400).end("Query limit reached!");
				}
			});
		});
	} else {
		res.status(400).end('Oops! Invalid URL!');
	}
};

db_add_new_test = function(param, cb) {
	request({url: param.protocol_prefixed_url, headers: {'User-Agent': user_agent}}, function(err, response, body) {
		if(!err && response.statusCode === 200) {
			var date_ms  = Date.parse(new Date());
			var tasks_counter = 0, cb_string;
			var test = new Test({url: param.url, protocol_prefixed_url: param.protocol_prefixed_url});
			if(param.email) test.email = param.email;
			if(param.user) test.user = param.user;
			test.save(function(err) {
				if(err) throw err;
				param.tasks.forEach(function(t) {
					var task = new Task({name: t.name, status: t.status, ttl: t.ttl, test: test._id, weight: t.weight, priority: t.priority});
					task.save(function(err) {
						if (err) throw err;
						tasks_counter ++;
						if(tasks_counter === param.tasks.length) {
							var test_id = test._id;
							cb(null, test_id);
						}
					});
				});
			});
		} else {
			cb("This domain doesn't exist!");
		}
	});
};

var getAuthorized = function(req, cb) {
	var authorized_user;
	if(req.cookies.access_token) {
		var data = authenticate.deserializeToken(req.cookies.access_token);
		data.forEach(function(datum) {
			if(typeof datum === 'string') authorized_user = datum;
		});
		//authorized_user = data[0];
		//console.log(req.cookies.access_token, '<--->',authorized_user);
		User.findById(authorized_user, function(err, user) {
			if(err) throw err;
			else if(user){
				authorized_user = {
					user_id: user._id,
					name: user.name, 
					email: user.email, 
					phone: user.phone, 
					customer_id: user.customer_id, 
					subscription_left: user.subscription_left
				};
				cb(null, authorized_user);
			} else {
				cb("Unauthorized!");
			}
		});
	} else {
		cb("Unauthorized!");
	} 
};

var getDomain = function(q) {
    var domain;
    //find & remove protocol (http, ftp, etc.) and get domain
    if (q.indexOf("://") > -1) {
        domain = q.split('/')[2];
    }
    else {
        domain = q.split('/')[0];
    }

    //find & remove port number
    domain = domain.split(':')[0];

    return domain;
};
/*
var strip_url = function(q) {
    var sub_location = url_sub_locaiton(q), result = q;
    if(sub_location) {
        result = q.replace(sub_location, '');
    }
    result = result.split('');
    if(result[result.length-1] === '/') result.pop();
    return result.join('');
};


var url_sub_locaiton = function(q) {
    var sub_location = "";
    q = (q.replace('http://', '')).replace('https://', '');
    sub_location = q.split('/');
    sub_location.shift();
    if(sub_location.length > 0) {
        var result = "/"+sub_location.join('/');
        if(result === "/") return false;
        else return result;
    } else {
        return false;
    }
};*/
 var add_prefix_protocol = function(q) {
    return 'http://'+(q.replace('http://', '')).replace('https://', '');
};