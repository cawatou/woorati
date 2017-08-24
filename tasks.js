var request = require('request'), 
    Task = require('./models/Task'),
    blc = require('broken-link-checker'),
    cheerio = require('cheerio'),
    exec = require('child_process').exec,
    //webshot = require('webshot'),
    //wkhtmltopdf = require('wkhtmltopdf'),
    screenshot = require('screenshot-stream'),
    fs = require('fs'),
    parseString = require('xml2js').parseString,
    async = require('async'),
    robots = require('robots'),
    parser = new robots.RobotsParser(),
    Task = require('./models/Task'),
    Test = require('./models/Test'),
    //crawl = require('crawl'),
    Crawler = require("simplecrawler"),
    nodemailer = require("nodemailer"),
    user_agent = "Mozilla/5.0 (X11; Linux i686; rv:5.0) Gecko/20100101 Firefox/5.0";

var smtpTransporter = nodemailer.createTransport({
   service: "Gmail",
   auth: {
       user: "wooratithesis@gmail.com",
       pass: "bachelors thesis"
   }
});

var server_address = "http://localhost:8000";

var tasks = {
    last_modified: function(task) {
        request({url: task.test.protocol_prefixed_url, headers: {'User-Agent': user_agent}}, 
        function(err, response, body) {
            var json = [{group: "On-site analysis", key: "last_modified", value: null, priority: "medium"}]; 
            if (!err && response.statusCode === 200) { 
                var last_modified = response.headers['last-modified'];
                json = [{group: "On-site analysis", key: "last_modified", value: last_modified, priority: "medium"}]; 
                updateTaskInDB(json, task._id, 'ready');            
            } else {
                updateTaskInDB(json, task._id, 'ready');  
            }        
        });
    },
    domain_age: function(task) {
        var domain = getDomain(task.test.protocol_prefixed_url);
        exec('whois ' + domain, function(error, stdout, stderr) {
            var value;
            if (stdout) {
                var creation_date_start_index = stdout.search("Creation Date:"),
                        register_Date_start_index = stdout.search("Registered:"),
                        created_start_index = stdout.search("created:"),
                        start_index, end_index, domain_registered_date;
                        
                var domain_dates = {
                    create: [ //date_str_length consists the length of create string and date string for parsing domain dates
                        {str: "Creation Date:"},// create_index: stdout.search("Creation Date:"), date_str_length: [15, 11]},
                        {str: "Registered:"},// create_index: stdout.search("Registered:"), date_str_length: [12, 15]},
                        {str: "created:"}//, create_index: stdout.search("created:"), date_str_length: [10, 9]}
                    ],
                    expire: [
                        
                    ]
                };
                        
                domain_dates.create.forEach(function(create) {
                    if(stdout.indexOf(create.str) > -1) {
                        var array_lines = stdout.split("\n");
                        array_lines.forEach(function(line) {
                            if(line.indexOf(create.str) > -1) {
                                domain_registered_date = line.replace(create.str, "");
                                if((new Date(domain_registered_date) + "") === "Invalid Date") domain_registered_date = domain_registered_date.replace(/ /g, "");
                                if ((new Date(domain_registered_date) + "") === "Invalid Date" && create.str === "created:") {
                                    var year; var date_month = new Array(2);
                                    domain_registered_date = domain_registered_date.split(".")[2]+"-"+domain_registered_date.split(".")[1]+"-"+domain_registered_date.split(".")[0];
                                }
                            }
                        }) ;
                    }
                });
                if ((new Date(domain_registered_date) + "") !== "Invalid Date") {
                    var domain_age = Date.parse(domain_registered_date)/1000; //domain age since 1970 jan in seconds
                    value = parseInt(Date.parse(new Date()))/1000 - parseInt(domain_age);
                }
            }
            var json = [{group: "On-site analysis", key: "domain_age", value: value, priority: "high"}];
            updateTaskInDB(json, task._id, 'ready');
        });
    },
    smtp_ftp_mail_check: function(task) {
         var parallel_async_functions = [], domain = getDomain(task.test.protocol_prefixed_url),
            json = [
                {group: "On-site analysis", key: "smtp", value: {status: 0, url: "smtp."+domain}, priority: "high"},
                {group: "On-site analysis", key: "mail", value: {status: 0, url: "mail."+domain}, priority: "high"},
                {group: "On-site analysis", key: "ftp", value: {status: 0, url: "ftp."+domain}, priority: "high"}
            ];
        json.forEach(function(json){
            parallel_async_functions.push(function(callback) {
                request({url: 'http://'+json.value.url, headers: {'User-Agent': user_agent}}, function(err, response, body) {
                    if(!err) { 
                        json.value.status = response.statusCode;
                    }
                    callback();
                });
            });
        });
        async.parallel(parallel_async_functions, function(err) {
            if(err) throw err;
            updateTaskInDB(json, task._id, 'ready');
        });
    },
    dom_checks: function(task, cb) {
        request({url: task.test.protocol_prefixed_url, headers: {'User-Agent': user_agent}},
        function(err, response, body) {
            var json_res= [];
            if(!err && response.statusCode === 200) {
                var $ = cheerio.load(body, {decodeEntities: false}), //html dom parser for element inspection
                    GA = checkGoogleAnalytics($('script')), YaM_id = checkYaMetrika($('script')),
                    title_tag = $('title'), meta_tags = $("meta"), h1_tags = $('h1'), img_tags = $('img');

                json_res.push({group: "On-site analysis", key: "google_analytics", value: GA, priority: "high"});
                
                json_res.push({group: "On-site analysis", key: "ya_metrika", value: YaM_id, priority: "high"});
                

                if (title_tag.length === 0) json_res.push({group: "On-site analysis", key: "title_tag", value: null, priority: "high"});
                else json_res.push({group: "On-site analysis", key: "title_tag", value: title_tag[0].children[0].data, priority: "high"});

                var description_tag_res = null;
                for (var i = 0; i < meta_tags.length; i++) {
                    if (meta_tags[i].attribs['name'] === "description") {
                        if (meta_tags[i].attribs['content'])
                            description_tag_res = {group: "On-site analysis", key: "description_meta_tag", value: meta_tags[i].attribs['content'], priority: "high"};
                        else 
                            description_tag_res = {group: "On-site analysis", key: "description_meta_tag", value: "", priority: "high"};
                        
                    }
                }

                if (!description_tag_res) description_tag_res = {group: "On-site analysis", key: "description_meta_tag", value: null, priority: "high"};

                json_res.push(description_tag_res);

                var h1_tags_count = h1_tags.length;
                var h1_tag_outer_html = [];
                for(var i = 0; i < h1_tags_count; i++) {
                    h1_tag_outer_html.push($.html(h1_tags[i]));
                }
                h1_tag_outer_html = getUniqueArray(h1_tag_outer_html);
                
                json_res.push({group: "On-site analysis", key: "h1_tags", value: h1_tag_outer_html, priority: "high"}); 
                
                var img_tags_count = img_tags.length;
                var img_tags_without_alt = [];
                for (var i = 0; i < img_tags_count; i++) {
                    if (!img_tags[i].attribs['alt']) {
                        img_tags_without_alt.push($.html(img_tags[i]));
                    }
                }
            
                img_tags_without_alt = getUniqueArray(img_tags_without_alt);
                json_res.push({group: "On-site analysis", key: "img_tags", value: {total: img_tags_count, without_alt: img_tags_without_alt}, priority: "high"});
                if(cb) {
                    cb(null, json_res);
                } else {
                    updateTaskInDB(json_res, task._id, 'ready');
                }
            } else {/*
                var status, error;
                if(response) staus = response.statusCode;
                if(err) error = err;*/
                
                //json_res.push({group: "On-site analysis", key: task.test.protocol_prefixed_url, value: {status: status, error: error}, priority: "high"});
                
                json_res.push({group: "On-site analysis", key: "google_analytics", value: null, priority: "high"});
                json_res.push({group: "On-site analysis", key: "ya_metrika", value: null, priority: "high"});
                json_res.push({group: "On-site analysis", key: "title_tag", value: null, priority: "high"});
                json_res.push({group: "On-site analysis", key: "description_meta_tag", value: null, priority: "high"});
                json_res.push({group: "On-site analysis", key: "h1_tags", value: [], priority: "high"});
                json_res.push({group: "On-site analysis", key: "img_tags", value: {total: 0, without_alt: []}, priority: "high"});

                if(cb) {
                    cb(new Error("invalid Url -->"+ task.test.protocol_prefixed_url), json_res);
                } else {
                    updateTaskInDB(json_res, task._id, 'ready');
                }
            }
        });
    },
    links: function(task, cb) {
        request({url: task.test.protocol_prefixed_url, headers: {'User-Agent': user_agent}}, 
        function(err, response, body) {
            if(!err && response.statusCode === 200) {
                var $ = cheerio.load(body, {decodeEntities: false});
                var anchor_tags = $('a');
                var length = anchor_tags.length;
                var async_parallel_func = [];
                var broken = [];
                for(var i=0; i<length; i++){
                    var anchor_tag = anchor_tags[i];
                    var href = anchor_tag.attribs['href'];
                    if(href){
                        if(href.indexOf('#') !== 0 && href.indexOf('javascript:void(0)') !== 0){
                            (function(href, anchor_tag){
                                async_parallel_func.push(function(callback){
                                    //(function(callback, href, anchor_tag){
                                        var url;
                                        if(href.indexOf('/') === 0) {
                                            url = 'http://'+getDomain(task.test.protocol_prefixed_url)+href;
                                        } else if(href.indexOf('http') === 0 || href.indexOf('www.') === 0){
                                            url = href;
                                        } else {
                                            url = task.test.protocol_prefixed_url+'/'+href;
                                        }
                                        request({url: url, headers: {'User-Agent': user_agent}}, function(err, response) {
                                            //console.log(anchor_tag);
                                            if(!err && response.statusCode !== 200) {
                                                broken.push(url);
                                            }
                                            callback(null);
                                        });
                                    //}(callback, href, anchor_tag));
                                });
                            }(href, anchor_tag));
                        } 
                    }
                } 
                if(async_parallel_func.length > 0) {
                    async.parallel(async_parallel_func, function(err) {
                        if(err) throw err;
                        broken = getUniqueArray(broken);
                        if(cb) {
                            cb(null, {broken: broken, url: task.test.protocol_prefixed_url, total: length});
                        } else {
                            var json = [{group: "On-site analysis", key: "links", value: {total: length, broken_links: broken}, priority: "high"}];
                            updateTaskInDB(json, task._id, 'ready');
                        }
                    });
                } else {
                    if(cb) {
                        cb(null, {broken: broken, url: task.test.protocol_prefixed_url, total: length});
                    } else {
                        var json = [{group: "On-site analysis", key: "links", value: {total: length, broken_links: broken}, priority: "high"}];
                        updateTaskInDB(json, task._id, 'ready');
                    }
                }
            } else {
                //console.log(task.test.protocol_prefixed_url, err);
                if(cb) {
                    cb(null, {broken: [], url: task.test.protocol_prefixed_url, total: 0});
                } else {
                    var json = [{group: "On-site analysis", key: "links", value: {total: 0, broken_links: []}, priority: "high"}];
                    updateTaskInDB(json, task._id, 'ready');
                }
            }
        }); 
        /*
        request({url: task.test.protocol_prefixed_url, headers: {'User-Agent': user_agent}}, 
        function(err, response, body) {
            if (!err && response.statusCode === 200) {
                var options = {filterLevel: 0, requestMethod: "GET", userAgent: user_agent}, 
                    json = {url: task.test.protocol_prefixed_url, total: 0, broken: []},
                    htmlChecker = new blc.HtmlChecker(options, {
                    link: function(result) {
                        if (result.error !== null) {
                            // Server denied access
                            if (result.error.code === "ECONNREFUSED"){console.log(result.url.resolved, "server denied access!");}
                            // Server could not be reached
                            if (result.error.code === "ENOTFOUND"){console.log(result.url.resolved, "server could'nt be reached!");}
                            // Connection timed out
                            if (result.error.code === "ETIMEDOUT"){console.log(result.url.resolved, "server connection timeout!");}
                            // Duh.
                            if (result.error.message === "Invalid URL"){console.log(result.url.resolved, result.error.message);}
                        } 
                        json.total ++;
                        //console.log(result.html.index, result.broken, result.html.text, result.url.resolved);
                        //-> 0 false "absolute link" "https://google.com/"
                        //-> 1 false "relative link" "https://mywebsite.com/path/to/resource.html"
                        //-> 2 true null "http://fakeurl.com/image.png"
                        //console.log('spidering', result.html.index);
                        if(result.broken) json.broken.push(result.url.resolved);
                    },
                    complete: function() {
                        json.broken = getUniqueArray(json.broken);
                        if(cb) {
                            cb(null, json);
                        } else {
                            json = [{group: "On-site analysis", key: "links", value: {total: json.total, broken_links: json.broken}, priority: "high"}];
                            updateTaskInDB(json, task._id, 'ready');
                        }
                    }
                });

                var baseUrl = task.test.protocol_prefixed_url;
                htmlChecker.scan(body, baseUrl);
            }
        }); */
    },
    main_mirror: function(task) {
        request({url: task.test.protocol_prefixed_url, headers: {'User-Agent': user_agent}}, 
        function(err, response, body) {
            var json =[{group: "On-site analysis", key: "main_mirror", value: null, priority: "high"}];
            if (!err && response.statusCode === 200) { 
                var  url, redirect1 = response.request.href;
                if(is_www_present(task.test.protocol_prefixed_url)) url = "http://"+getDomain(task.test.protocol_prefixed_url);
                else url = "http://"+getDomain(task.test.protocol_prefixed_url);
                request({url: url, headers: {'User-Agent': user_agent}}, function(err, response, body) {
                    var json = [{group: "On-site analysis", key: "main_mirror", value: null, priority: "high"}];
                    if(!err && response.statusCode === 200) {
                        if(redirect1 === response.request.href) {
                            json = [{group: "On-site analysis", key: "main_mirror", value: response.request.href, priority: "high"}];
                        }
                    }
                    updateTaskInDB(json, task._id, 'ready');
                });
            } else {
                updateTaskInDB(json, task._id, 'ready');
            }
        });
    },
    img_bin_data: function(task) { /*
        request({url: task.test.protocol_prefixed_url, headers: {'User-Agent': user_agent}}, function(err, response, body) {
            if(err) throw err;
            var filename ="/root/screenshots/"+createRandomId()+".png",
                options = {
                    windowSize: {
                        width: 1024, height: 768
                    },
                    shotSize: {width: 'window', height: 'window'},
                    siteType: 'html',
                    userAgent: user_agent
                };
            webshot(body, filename, options, function(err) {
                if(err) throw err;
                fs.readFile(filename, function(err, data) {
                    if (err) throw err; // Fail if the file can't be read.
                    var json = [{group: "On-site analysis", key:"img_bin_data", value: data.toString('base64'), priority: "high"}];
                    fs.unlink(filename, function (err) {
                        if (err) throw err;
                        console.log('site screenshot '+filename+' successfully deleted!');
                    });
                    updateTaskInDB(json, task._id, 'ready');
                });
            });
        });*/
        var filename = __dirname + "/screenshots/" + task.test.url+createRandomId()+".png";
        var stream = screenshot(task.test.protocol_prefixed_url, '1024x768', {crop: true, userAgent: user_agent, delay: 5});
        stream.pipe(fs.createWriteStream(filename));
        var data = '';
        stream.on("data", function(buf) {
            data = data + buf.toString('base64');
        });
        stream.on("end", function(b) {
            var json = [{group: "On-site analysis", key:"img_bin_data", value: data, priority: "high"}];
            fs.unlink(filename, function (err) {
                if (err) throw err;
                console.log('site screenshot '+filename+' successfully deleted!');
            });
            updateTaskInDB(json, task._id, 'ready');
        });
    },
    google_total_indexed_page: function(task) {
        var query = "site:"+task.test.url;
        request({url: "https://www.google.com/search?q="+query, headers: {'User-Agent': user_agent}}, function(err, response, body) {
            var json = [{group: "On-site analysis", key:"google_total_indexed_page", value: null, priority: "high"}];
            if (!err && response.statusCode === 200) { 
                var $ = cheerio.load(body, {decodeEntities: false}),
                    result_tag = $('#resultStats'),
                    total_indexed = parseInt(result_tag[0].children[0].data.replace(/\D/g,''));
                if(total_indexed) json = [{group: "On-site analysis", key:"google_total_indexed_page", value: total_indexed, priority: "high"}];
            }
            updateTaskInDB(json, task._id, 'ready');
        });
    },
    google_page_insight: function(task) {
        var strategies = ["mobile", "desktop"], 
            google_api_key = "AIzaSyCxXmipeJySwtZM1-TqApHsgwhkb5RlDz0", json = [];
        strategies.forEach(function(strategy, index) {
            request({url: 'https://www.googleapis.com/pagespeedonline/v2/runPagespeed?screenshot=true&strategy='+strategy+'&url='+task.test.protocol_prefixed_url+'&key='+google_api_key, headers: {'User-Agent': user_agent}}, 
                function(err, response, body) {
                    if(strategy === "desktop") {
                        if (!err && response.statusCode === 200) {
                            body = JSON.parse(body);
                            var data = body.screenshot.data.replace(/_/g, '/');
                            data = data.replace(/-/g, '+');
                            json.push({group: "On-site analysis", key: "google_desktop_page_speed", value: body.ruleGroups.SPEED.score, priority: "high"});
                            json.push({group: "On-site analysis", key: "google_desktop_page_screenshot", value: "data:"+body.screenshot.mime_type+";base64,"+data, priority: "high"});
                        } else {
                            json.push({group: "On-site analysis", key: "google_desktop_page_speed", value: null, priority: "high"});
                            json.push({group: "On-site analysis", key: "google_desktop_page_screenshot", value: null, priority: "high"});
                        }
                    } else if(strategy === "mobile") {
                        if (!err && response.statusCode === 200) {
                            body = JSON.parse(body);
                            var data = body.screenshot.data.replace(/_/g, '/');
                            data = data.replace(/-/g, '+');
                            json.push({group: "On-site analysis", key: "google_mobile_page_speed", value: body.ruleGroups.SPEED.score, priority: "high"});
                            json.push({group: "On-site analysis", key: "google_mobile_page_usability", value: body.ruleGroups.USABILITY.score, priority: "high"});
                            json.push({group: "On-site analysis", key: "google_mobile_page_screenshot", value: "data:"+body.screenshot.mime_type+";base64,"+data, priority: "high"});
                        } else {
                            json.push({group: "On-site analysis", key: "google_mobile_page_speed", value: null, priority: "high"});
                            json.push({group: "On-site analysis", key: "google_mobile_page_usability", value: null, priority: "high"});
                            json.push({group: "On-site analysis", key: "google_mobile_page_screenshot", value: null, priority: "high"});
                        }
                    }
                    if(strategies.length-1 === index) {
                        updateTaskInDB(json, task._id, 'ready');
                    }
                }
            );
        });
    },
    google_snippet_screenshot: function(task) {/*
        request({url: "https://www.google.com/search?q="+task.test.url, headers: {'User-Agent': user_agent}}, function(err, response, body) {
            var json = [{group: "On-site analysis", key:"google_snippet_screenshot", value: null, priority: "high"}];
            if (!err && response.statusCode === 200) { 
                var filename = "/root/screenshots/"+createRandomId()+".png",
                    options = {
                        siteType: 'html', 
                        shotOffset: {
                            left: 100,
                            bottom: 400,
                            right: 400
                        },
                        userAgent: user_agent
                    };
                webshot(body, filename, options, function(err) {
                    if(err) throw err;
                    fs.readFile(filename, function(err, data) {
                        if (err) throw err; // Fail if the file can't be read.
                        json = [{group: "On-site analysis", key:"google_snippet_screenshot", value: data.toString('base64'), priority: "high"}];
                        fs.unlink(filename, function (err) {
                            if (err) throw err;
                            console.log('successfully deleted google screenshot '+filename);
                        });
                        updateTaskInDB(json, task._id, 'ready'); 
                    });
                });
            } else {
                updateTaskInDB(json, task._id, 'ready'); 
            }
        });*/
        var filename = __dirname + "/screenshots/" + task.test.url+createRandomId()+".png";
        var stream = screenshot('https://www.google.com/search?q='+task.test.url, '1024x768', {crop: true, selector: 'li.g:first-child'});
        stream.pipe(fs.createWriteStream(filename));
        var data = '';
        stream.on("data", function(buf) {
            data = data + buf.toString('base64');
        });
        stream.on("end", function(b) {
            json = [{group: "On-site analysis", key:"google_snippet_screenshot", value: data, priority: "high"}];
            fs.unlink(filename, function (err) {
                if (err) throw err;
                console.log('successfully deleted google snippet screenshot '+filename);
            });
            updateTaskInDB(json, task._id, 'ready'); 
        });
    },
    yandex_total_indexed_page: function(task) {
        var user = "prataksha-gurung", key = "03.319807872:651fdc5deadb8a620043049cad92202f", lang = "en";
        var query = "host:"+getDomain(task.test.protocol_prefixed_url)+"* | host:www."+getDomain(task.test.protocol_prefixed_url)+"*";
        request({url: "https://yandex.com/search/xml?l10n="+lang+"&user="+user+"&key="+key+"&query="+query, headers: {'User-Agent': user_agent}},
            function(err, response, body) {
                var json = [{group: "On-site analysis", key:"yandex_total_indexed_page", value: null, priority: "high"}], total_indexed;
                if (!err && response.statusCode === 200) { 
                    parseString(body, function (err, result) {
                        if(err) throw err;
                        if(!result.yandexsearch.response[0].error && result.yandexsearch.response[0].found)
                            total_indexed = result.yandexsearch.response[0].found[0]._;
                        else 
                            total_indexed = '0';
                        if(total_indexed) json = [{group: "On-site analysis", key:"yandex_total_indexed_page", value: total_indexed, priority: "high"}];
                        updateTaskInDB(json, task._id, 'ready');
                    });
                } else {
                    updateTaskInDB(json, task._id, 'ready');
                }
            }
        );
    },
    yandex_catalog: function(task) {
        request({url: 'https://yaca.yandex.ru/yca/cy/ch/'+getDomain(task.test.protocol_prefixed_url), headers: {'User-Agent': user_agent}},
        function(err, response, body) {
            var json = [{group: "On-site analysis", key: "yandex_catalog", value: null, priority: "high"}];
            if(!err && response.statusCode === 200) {
                var $ = cheerio.load(body, {decodeEntities: false});
                var total = parseInt($('.b-cy_error-cy')[0].children[0].data.split('\n')[2]);
                json = [{group: "On-site analysis", key: "yandex_catalog", value: total, priority: "high"}]; 
            } 
            updateTaskInDB(json, task._id, 'ready');
        });
    },
    yandex_snippet: function(task) {
        var key = 'rca.1.1.20150614T050039Z.c38e6cdba6ce4777.d36a460012ca933d4b9f9d9a47b779995d60d709';
        request({url: "http://rca.yandex.com/?key="+key+"&url="+task.test.protocol_prefixed_url, headers: {'User-Agent': user_agent}}, function(err, response, body) {
            var json = [{group: "On-site analysis", key:"yandex_snippet", value: null, priority: "high"}];
            if (!err && response.statusCode === 200) { 
                body = JSON.parse(body);
                var image;
                if(body.img) {
                    image = body.img[0];
                }
                json = [{group: "On-site analysis", key:"yandex_snippet", value: {image: image, title: body.title, content: body.content}, priority: "high"}]; 
            } 
            updateTaskInDB(json, task._id, 'ready');
        });
    },
    webtest_different_location: function(task) {
        var key = 'A.78abb84222e71af5896f7887e351e91d',
            locations = {US: 'ec2-us-west-1:Chrome', EU: 'ec2-eu-west-1:Chrome', AUS: 'ec2-ap-southeast-1:Chrome', JAPAN: 'ec2-ap-northeast-1:Chrome'};

        var json = [{group: "On-site analysis", key: "webtest_different_location", value: {}, priority: "medium"}],
            request_result_counter = 0, total_locations,
            webtest_101_200_checker = function(err, response, body) {
                if(!err && response.statusCode === 200) {
                    body = JSON.parse(body);
                    if(body.statusCode === 200) {
                        var test_url = 'http://www.webpagetest.org/jsonResult.php?test='+body.data.testId;
                        request({url: test_url, headers: {'User-Agent': user_agent}} ,function(err, response, body) {
                            if(!err && response.statusCode === 200) {
                                body = JSON.parse(body);
                                json[0].value[body.data.from] = {
                                    firstView: {
                                        load_time: body.data.average.firstView.loadTime,
                                        time_to_first_byte: body.data.average.firstView.TTFB,
                                        total_request_made: body.data.average.firstView.requests
                                    },
                                    repeatView: {
                                        load_time: body.data.average.repeatView.loadTime,
                                        time_to_first_byte: body.data.average.repeatView.TTFB,
                                        total_request_made: body.data.average.repeatView.requests
                                    }
                                };
                                request_result_counter ++;
                                if(request_result_counter === total_locations) {
                                    updateTaskInDB(json, task._id, 'ready');
                                }
                            }
                        });
                    } else {
                        setTimeout(function(){ 
                            var test_url = 'http://www.webpagetest.org/testStatus.php?f=json&test='+body.data.testId;
                            request({url: test_url, headers: {'User-Agent': user_agent}}, webtest_101_200_checker);
                        }, 10000);
                    }
                }
            };
        var count = 0;
        for (var location_key in locations) {
            if (locations.hasOwnProperty(location_key)) {
               ++count;
            }
        }
        total_locations = count;
        for(var location_key in locations) {
            request({url: 'http://www.webpagetest.org/runtest.php?url='+task.test.protocol_prefixed_url+'& location='+locations[location_key]+'&k='+key+'&f=json', headers: {'User-Agent': user_agent}},
            function(err, response, body){
                if(!err && response.statusCode === 200) {
                    body = JSON.parse(body);
                    if(body.statusCode !== 400) {
                        var test_url = 'http://www.webpagetest.org/testStatus.php?f=json&test='+body.data.testId;
                        request({url: test_url, headers: {'User-Agent': user_agent}}, webtest_101_200_checker);
                    } else {
                        json.value = body;
                        updateTaskInDB(json, task._id, 'ready');
                    }
                } else {
                    total_locations --;
                }
                if(total_locations === 0 || request_result_counter === total_locations) {
                    updateTaskInDB(json, task._id, 'ready');
                }
            });
        }
    },
    web_spider: function(task) {
        var async_functions = [], pages = [],
            json = {group: "On-site analysis", key: "web_spider", value: [], priority: "medium"};
        var siteCrawler = new Crawler(getDomain(task.test.protocol_prefixed_url), "/", 80);

        siteCrawler
            .on("discoverycomplete", function(queueItem, resources) {
                if(queueItem.stateData.contentType.indexOf('text/html') >= 0) {
                    if(pages.indexOf(queueItem.url) < 0) {
                        pages.push(queueItem.url);
                    }
                }
            })
            .on("complete", function() {
                pages = getUniqueArray(pages);
                pages.forEach(function(page) {
                    async_functions.push(function(cb) {
                        var param = {test: {protocol_prefixed_url: page}};
                        tasks.dom_checks(param, function(err, data) {
                            if(!err) {
                                var value = {url: page, dom_checks: data, total_links: 0, broken_links: 0};
                                tasks.links(param, function(err, data) {
                                    if(err) throw err;
                                    if(value.url === data.url) {
                                        value.total_links = data.total;
                                        value.broken_links = data.broken;
                                        json.value.push(value);
                                    }else {
                                        console.log("Something went bad while spidering!!!!");
                                    }
                                    cb(null, null);
                                });
                            } else {
                                cb(null, null);
                            }
                        });
                    });
                });
                async.series(async_functions, function(err) {
                    if(err) throw err;
                    json = [json];
                    updateTaskInDB(json, task._id, 'ready');
                });
            });
        siteCrawler.interval = 10;
        siteCrawler.maxConcurrency = 50;
        siteCrawler.timeout = 60000;
        siteCrawler.userAgent = user_agent;

        siteCrawler.start();
    },
    sitemap: function(task) {
        var url =task.test.protocol_prefixed_url;
        parser.setUrl(url+'/robots.txt', function(parser, success) {
            var json = [];
            if(success) {
                    json.push({group: "On-site analysis", key: "robots_txt", value: parser.chunks[0], priority: "high"});
                    parser.getSitemaps(function(sitemaps) {
                        var json_temp = {group: "On-site analysis", key: "valid_sitemap", value: [], priority: "high"};
                        var sitemap_counter = 0;
                        sitemaps.forEach(function(sitemap, index) {
                            if(sitemap.indexOf('http') !== 0 && sitemap.indexOf('www.') !== 0) {
                                if(sitemap.indexOf('/').indexOf === 0) {
                                    sitemap = url+sitemap;
                                } else if (sitemap.indexOf(getDomain(url)) !== 0) {
                                    sitemap = url+"/"+sitemap;
                                } else {
                                    sitemap = 'http://'+sitemap;
                                }
                            }
                            var sitemap_contents = [];
                            request({url: sitemap, headers: {'User-Agent': user_agent}}, function(err, response, body) {
                                if (!err && response.statusCode === 200) {
                                    json_temp.value.push({
                                        sitemap: response.request.href, body: body
                                    });
                                    sitemap_contents.push(body);
                                } 
                                json.push(json_temp);
                                sitemap_counter ++;
                                if(sitemaps.length === sitemap_counter) {
                                    updateTaskInDB(json, task._id, 'ready');
                                }
                            });
                        });
                    });
                } else {
                    json.push({group: "On-site analysis", key: "robots_txt", value: null, priority: "high"});
                    json.push({group: "On-site analysis", key: "valid_sitemap", value: [], priority: "high"});
                    updateTaskInDB(json, task._id, 'ready');
                }
        });
    }
};

var getUniqueArray = function(array) {
    var unique = [];
    
    for (var i = 0; i < array.length; i++) {
        var current = array[i];
        if(current) {
            current = current.split('');
            if(current[current.length-1] === "/") current.pop();
            current = current.join('');
            if (unique.indexOf(current) < 0) unique.push(current);
        }
    }
    return unique;
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

var is_www_present = function(q) {
    var www_present = false;
    if(q.indexOf('http://www.') === 0 || q.indexOf('https://www.') === 0 || q.indexOf('www.') === 0) {
            www_present = true;
    }
    return www_present;
};

var checkGoogleAnalytics = function(scripts) {
    var scripts_concat, //scripts_src_concat, 
        UA_code;
    for (var i = 0; i < scripts.length; i++) {
        if (scripts[i].children.length > 0)
            scripts_concat += scripts[i].children[0].data;
        //else scripts_src_concat += scripts[i].attribs.src;
    }

    //var s = scripts_concat + " " + scripts_src_concat;
    /*
    if ((s.indexOf('google-analytics.com/ga.js') > -1) ||
            (s.indexOf('google-analytics.com/analytics.js') > -1) ||
            (s.indexOf('doubleclick.net/dc.js') > -1)) {
        for(var i = s.indexOf("'UA-")+1; ;i++){
            if(s[i] === "'") {break;} 
            UA_code += s[i];
        }
    } */
    if(scripts_concat) {
        var temp = scripts_concat.match(/(UA-[\d-]+)/g);
        if(temp instanceof Array) {
            UA_code = temp.join(" and ");
        }
    }
    return UA_code;
};

var checkYaMetrika = function(scripts) {
    var scripts_concat, //scripts_src_concat, 
        ya_metrika_id;
    for (var i = 0; i < scripts.length; i++) {
        if (scripts[i].children.length > 0)
            scripts_concat += scripts[i].children[0].data;
        //else scripts_src_concat += scripts[i].attribs.src;
    }

    //var s = scripts_concat + " " + scripts_src_concat;
    /*
    if (s.indexOf('Ya.Metrika') > -1) {
        for(var i = s.indexOf("yaCounter")+"yaCounter".length; ;i++){
            if(s[i] === " ") {break;} 
            ya_metrika_id += s[i];
        }
    } */
    if(scripts_concat) {
        var temp = scripts_concat.match(/(yaCounter[\d-]+)/g);
        if(temp instanceof Array) {
            for(var i=0; i<temp.length; i++) {
                temp[i] = temp[i].split('yaCounter')[1];
            }
            ya_metrika_id = temp.join(" and ");
        }
    }
    return ya_metrika_id;
};

var createRandomId = function() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text+"_"+(Date.parse(new Date()));
};

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
};

var updateTaskInDB = function (json, task_id, status) {
    Task.findById(task_id, function(err, task){
        if(err) throw err;
        if(json !== false)
            task.value = JSON.stringify(json);
        task.status = status;
        task.save(function(err) {
            if(err) throw err;
            console.log("task ", task.name, " #", task._id, " is ready!");
            Task.find({test: task.test}, function(err, tasks) {
                if(err) throw err;
                var test_ready = true;
                tasks.forEach(function(task) {
                    if(task.status !== "ready") test_ready = false;
                });
                if(test_ready) {
                    Test.findById(task.test, function(err, test) {
                        if(err) throw err;
                        if(test.email) {
                            sendEmail(test.email, test._id, function(err) {
                                if(err) throw err;
                                console.log('Test completion email sent: ');
                            });
                        } else if(test.user) {
                            Test.populate(test, {path: 'user'}, function(err, test) {
                                if(err) throw err;
                                var params = {
                                    url: server_address+"/#/testResult/"+test._id,
                                    filename: __dirname+"/pdf/"+test_id+".pdf"
                                };
                                sendEmail(test.user.email, test._id, function(err) {
                                    if(err) throw err;
                                    console.log('Test completion email sent: ' + info.response);
                                });
                            });
                        } else {
                            console.log("no user/email info!!!");
                        }
                    });
                }
            });
        });
    });
};

var sendEmail = function(email, test_id, cb) {
    if(email && test_id && cb) {
        var mailOptions = {
            from: 'Woorati ✔ <woorati@woorati.com>', // sender address
            to: email, // list of receivers
            subject: 'Web analysis test completed ✔', // Subject line
            //text: 'Please click the following link to confirm your registration.', // plaintext body
            html: '<a href="'+server_address+'/#/testResult/'+test_id+'" >Click here for the test report</a> or <a href="'+server_address+'/test/'+test_id+'">Click here for JSON data</a><br><a href="'+server_address+'/export/test/"'+test_id+'">Click here for the pdf</a><br><div>Thanks!<br><br><br><br>br,<br>Woorati</div>' // html body
        };
        smtpTransporter.sendMail(mailOptions, function(error, info){
            if(error) cb(error);
            cb();
        });
    } else {
        console.log('email sending failed... not enough parameters!');
    }
};

exports.performTask = function(task) {
    tasks[task.name](task);
};