app
    .controller('mainCtrl', ['$scope', '$rootScope', 'mainService', '$http', '$routeParams', 'gettextCatalog', '$q',
        function($scope, $rootScope, mainService, $http, $routeParams, gettextCatalog, $q) {
    //templates url to be included in index page
    $scope.templates = {
        navBar: "templates/navigation.html",
        header: "templates/header.html",
        footer: "templates/footer.html"
    };
    var email_regex = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
    $rootScope.hideInputField = false;
    $rootScope.progressBarHide = true;
    $rootScope.testResultUrl = false;
    $rootScope.hideEmailField = true;
    $rootScope.img_bin_data = false;
    $rootScope.hideResultField = true;
    //$rootScope.user = false;
    
    //enable button only when the url in input control is valid
    $scope.goBtn = {disabled: "disabled"};
    $scope.goEmailBtn = {disabled: "disabled"};
    //input control
    $scope.input = {url: "", error: ""};
    
    var langs = {"en": "en_US", "fi": "fi_FI"};

    $http.get('/user')
        .success(function(data, status, headers, config) {
            $rootScope.user = {
                name: data.name,
                avatar: data.avatar,
                email: data.email,
                phone: data.phone,
                subscription_left: data.subscription_left,
                customer_id: data.customer_id
            };
            $scope.input.email = data.email;
            $scope.goEmailBtn.disabled = "";
            console.log(data);
        }).
        error(function(data, status, headers, config) {
            $rootScope.user = undefined;
            console.log(status);
        });
    
    $scope.setLang = function(langKey) {
        //change the language during runtime
        //$translate.use(langKey);
        gettextCatalog.setCurrentLanguage(langs[langKey]);
        $scope.active_lang = langKey;
        $scope.inactive_langs = [];
        for(var key in langs) {
            if(key !== langKey) $scope.inactive_langs.push(key);
        }
    };

    for (var key in langs) {
        if(langs[key] === gettextCatalog.getCurrentLanguage()) {
            $scope.setLang(key);
            break;
        }
    }

    $scope.checkUrl = function() {
        if(validator.isURL($scope.input.url)) {
            $scope.goBtn.disabled = "";
        } else {
            $scope.goBtn.disabled = "disabled";
        }
    };

    $scope.checkEmail = function() {
        if(email_regex.test($scope.input.email)) {
            $scope.goEmailBtn.disabled = "";
        } else {
            $scope.goEmailBtn.disabled = "disabled";
        }
    };
    
    $scope.url_error_alerts = [];

    $scope.closeUrl_error_alert = function(index) {
        $scope.url_error_alerts.splice(index, 1);
    };

    $scope.showEmailField = function() {
        if(validator.isURL($scope.input.url)) {
            $rootScope.hideEmailField = false;
        }
    };

    $scope.redoTest = function() {
        $http.get('/go?q='+$scope.input.url+'&email='+$scope.input.email+'&new_test=1')
        .success(function(data, status, headers, config) {
            $scope.closeUrl_error_alert(0);
            $scope.input.error = "";
            $rootScope.testResultUrl = "/#/testResult/"+data.test_id;
            $rootScope.testNew = false;
            $rootScope.testResultMsg = "See the test report...";
        }).
        error(function(data, status, headers, config) {
            $rootScope.testResultUrl = false;
            //$scope.showResult = false;
            $scope.url_error_alerts = [
                {type: 'danger', msg: error}
            ];
            $scope.input.error = "url-input-error";  
        });
    };

    $scope.go = function() {
        if(email_regex.test($scope.input.email)) {
            $rootScope.testResultUrl = false;
            $rootScope.hideInputField = false;
            $rootScope.hideEmailField = false;
            $rootScope.testNewId = false;
            var param = {url: $scope.input.url, email: $scope.input.email, newTest: $rootScope.testNewId};
            mainService.go(param)  
                .then(function(res){
                    //success
                    try{
                        var json = JSON.parse(res);
                        $rootScope.testResultUrl = "/#/testResult/"+json.test_id;
                        if(json.old) {
                            $rootScope.testResultMsg = "See the previous test report(free)...";
                            $rootScope.testNewMsg = "Redo the test(not free)..."
                            $rootScope.testNew = true;
                        } else {
                            $rootScope.testResultMsg = "See the test report...";
                            $rootScope.testNew = false;
                        }
                        //window.localStorage.json_respons = JSON.stringify(json_respons);
                    }catch(e){
                        // stop here no need to parse
                        console.log(e);
                    }
       
                    
                    
                    $scope.input.error = "";
                    
                }, function(err) {
                    $rootScope.testResultUrl = false;
                    //$scope.showResult = false;
                    $scope.url_error_alerts = [
                        {type: 'danger', msg: err}
                    ];
                    $scope.input.error = "url-input-error";
                });
        }
    };

    $scope.find_meta = function() {  
        $rootScope.hideResultField = false;
        var str = $scope.input.url;
        if(str.indexOf('http://') + 1) {
            var url = $scope.input.url;
        }else{
            var url = 'http://' + $scope.input.url;
        }    
        var param = {url: url, email: $scope.input.email};
        mainService.go(param)  
            .then(function(res){                
                
            }, function(err) {
                $rootScope.testResultUrl = false;
                //$scope.showResult = false;
                $scope.url_error_alerts = [
                    {type: 'danger', msg: err}
                ];
                $scope.input.error = "url-input-error";
            });
    };
    
    
    /*
    socket.on('on site analysis', function(json) {
        //console.log(json);
        json = JSON.parse(json);
        json.forEach(function(j) {
            $scope.results[0]['analysis'].push(j);
        });
    });*/
            
   
    var default_url_options = {
        protocols: [ 'http', 'https', 'ftp' ], 
        require_tld: true, 
        require_protocol: false, 
        allow_underscores: false, 
        allow_trailing_dot: false, 
        allow_protocol_relative_urls: false
    };
    
    var default_fqdn_options = {
        require_tld: true, 
        allow_underscores: false, 
        allow_trailing_dot: false
    };
    
    var ipv4Maybe = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/,
        ipv6Block = /^[0-9A-F]{1,4}$/i;
    
    var validator = {isURL: "", isIP: "", isFQDN: ""};
    
    validator.isURL = function (url, options) {
        if (!url || url.length >= 2083 || /\s/.test(url)) {
            return false;
        }
        if(url.indexOf('@') > -1) {
            return false;
        }
        if (url.indexOf('mailto:') === 0) {
            return false;
        }
        options = merge(options, default_url_options);
        var protocol, auth, host, hostname, port,
            port_str, split;
        split = url.split('://');
        if (split.length > 1) {
            protocol = split.shift();
            if (options.protocols.indexOf(protocol) === -1) {
                return false;
            }
        } else if (options.require_protocol) {
            return false;
        }  else if (options.allow_protocol_relative_urls && url.substr(0, 2) === '//') {
            split[0] = url.substr(2);
        }
        url = split.join('://');
        split = url.split('#');
        url = split.shift();

        split = url.split('?');
        url = split.shift();

        split = url.split('/');
        url = split.shift();
        split = url.split('@'); //this is not needed.. this checks domain name  from email address
        if (split.length > 1) {
            auth = split.shift();
            if (auth.indexOf(':') >= 0 && auth.split(':').length > 2) {
                return false;
            }
        }
        hostname = split.join('@');
        split = hostname.split(':');
        host = split.shift();
        if (split.length) {
            port_str = split.join(':');
            port = parseInt(port_str, 10);
            if (!/^[0-9]+$/.test(port_str) || port <= 0 || port > 65535) {
                return false;
            }
        }
        if (!validator.isIP(host) && !validator.isFQDN(host, options) &&
                host !== 'localhost') {
            return false;
        }
        if (options.host_whitelist &&
                options.host_whitelist.indexOf(host) === -1) {
            return false;
        }
        if (options.host_blacklist &&
                options.host_blacklist.indexOf(host) !== -1) {
            return false;
        }
        return true;
    };

    validator.isIP = function (str, version) {
        version = validator.toString(version);
        if (!version) {
            return validator.isIP(str, 4) || validator.isIP(str, 6);
        } else if (version === '4') {
            if (!ipv4Maybe.test(str)) {
                return false;
            }
            var parts = str.split('.').sort(function (a, b) {
                return a - b;
            });
            return parts[3] <= 255;
        } else if (version === '6') {
            var blocks = str.split(':');
            var foundOmissionBlock = false; // marker to indicate ::

            if (blocks.length > 8)
                return false;

            // initial or final ::
            if (str === '::') {
                return true;
            } else if (str.substr(0, 2) === '::') {
                blocks.shift();
                blocks.shift();
                foundOmissionBlock = true;
            } else if (str.substr(str.length - 2) === '::') {
                blocks.pop();
                blocks.pop();
                foundOmissionBlock = true;
            }

            for (var i = 0; i < blocks.length; ++i) {
                // test for a :: which can not be at the string start/end
                // since those cases have been handled above
                if (blocks[i] === '' && i > 0 && i < blocks.length -1) {
                    if (foundOmissionBlock)
                        return false; // multiple :: in address
                    foundOmissionBlock = true;
                } else if (!ipv6Block.test(blocks[i])) {
                    return false;
                }
            }

            if (foundOmissionBlock) {
                return blocks.length >= 1;
            } else {
                return blocks.length === 8;
            }
        }
        return false;
    };
    
    validator.isFQDN = function (str, options) {
        options = merge(options, default_fqdn_options);

        /* Remove the optional trailing dot before checking validity */
        if (options.allow_trailing_dot && str[str.length - 1] === '.') {
            str = str.substring(0, str.length - 1);
        }
        var parts = str.split('.');
        if (options.require_tld) {
            var tld = parts.pop();
            if (!parts.length || !/^([a-z\u00a1-\uffff]{2,}|xn[a-z0-9-]{2,})$/i.test(tld)) {
                return false;
            }
        }
        for (var part, i = 0; i < parts.length; i++) {
            part = parts[i];
            if (options.allow_underscores) {
                if (part.indexOf('__') >= 0) {
                    return false;
                }
                part = part.replace(/_/g, '');
            }
            if (!/^[a-z\u00a1-\uffff0-9-]+$/i.test(part)) {
                return false;
            }
            if (part[0] === '-' || part[part.length - 1] === '-' ||
                    part.indexOf('---') >= 0) {
                return false;
            }
        }
        return true;
    };
    
    var merge = function(obj, defaults) {
        obj = obj || {};
        for (var key in defaults) {
            if (typeof obj[key] === 'undefined') {
                obj[key] = defaults[key];
            }
        }
        return obj;
    };
}]);

