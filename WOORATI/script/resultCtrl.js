app
    .controller('resultCtrl', ['$scope', '$rootScope', 'resultService', '$routeParams', 'gettextCatalog', '$timeout', '$location',
        function($scope, $rootScope, resultService, $routeParams, gettextCatalog, $timeout, $location) {
		    $rootScope.hideInputField = true;
		    $rootScope.progressBarHide = false;
		    $rootScope.testResultUrl = false;

		    $scope.fileFormat = $location.search().fileFormat;

		    var secondsToString = function(seconds){
		        var numyears = Math.floor(seconds / 31536000);
		        var numdays = Math.floor((seconds % 31536000) / 86400); 
		        //var numhours = Math.floor(((seconds % 31536000) % 86400) / 3600);
		        //var numminutes = Math.floor((((seconds % 31536000) % 86400) % 3600) / 60);
		        //var numseconds = (((seconds % 31536000) % 86400) % 3600) % 60;
		        
		        var str = "";
		        
		        if(numyears !== 0) {
		            str += numyears + " years";
		        }
		        if(numdays !== 0) {
		            if(str) str += " and ";
		            str += numdays + " days ";
		        }
		        return str+" old";
		    };

		    $scope.toggleSuggestion = function(key) {
		        if($('.'+key).parent().height() === 0) {
		            $('.'+key).parent().height($('.'+key).height()+10);
		        }else {
		            $('.'+key).parent().height(0);
		        }
		    };

		    $scope.seeAll = function(key) {
		        if(key.indexOf("img_tags") > -1)
		            $scope[key].limit = $scope[key].tags_without_alt.length;
		        else if(key.indexOf("h1_tags") > -1)
		            $scope[key].limit = $scope[key].content.length;
		        else if(key.indexOf("links") > -1)
		            $scope[key].limit = $scope[key].broken_links.length;
		        else if(key.indexOf("robots_txt") > -1)
		            $scope[key].limit = $scope[key].content.length;
		        else if(key.indexOf("valid_sitemap") > -1)
		            $scope[key].value[0].limit = $scope[key].value[0].content.length;
		        return true;
		    };

		    $scope.seeLess = function(key) {
		        if(key.indexOf("img_tags") > -1)
		            $scope[key].limit = 5;
		        else if(key.indexOf("h1_tags") > -1)
		            $scope[key].limit = 5;
		        else if(key.indexOf("links") > -1)
		            $scope[key].limit = 5;
		        else if(key.indexOf("robots_txt") > -1)
		            $scope[key].limit = 300;
		        else if(key.indexOf("valid_sitemap") > -1)
		            $scope[key].value[0].limit = 300;
		        return true;
    		};

		    var passValuesToView = function(c) {
		        if(c.key === $scope.input.url) {
		            if (c.value) {
		            	$scope.url = {
		            		content: c.value,
		            		priority: c.priority,
		            		marker_img: "/assets/success.png"
		            	};
		            } else {
		                $scope.url = {
		            		content: c.value,
		            		priority: c.priority,
		            		marker_img: "/assets/warn.png"
		            	};
		            }
		        }
		        if(c.key === 'last_modified' || c.key === 'smtp' || c.key === 'mail' || c.key === 'ftp' || c.key === 'google_analytics' ||
		        	c.key === 'ya_metrika' || c.key === 'title_tag' || c.key === 'description_meta_tag' || c.key === 'main_mirror' ||
		        	c.key === 'google_total_indexed_page' || c.key === 'yandex_total_indexed_page' || c.key === 'google_desktop_page_speed' || 
		        	c.key === 'google_mobile_page_usability' || c.key === 'google_desktop_page_screenshot' || c.key === 'google_mobile_page_speed' ||
		        	c.key === 'google_mobile_page_screenshot' || c.key === 'yandex_snippet' || c.key === 'sitemap_spidered' || c.key === 'yandex_catalog') {
		            if (c.value) {
		            	$scope[c.key] = {
		            		content: c.value,
		            		content_length: c.value.length,
		            		priority: c.priority,
		            		marker_img: "/assets/success.png"
		            	};
		            } else {
		                $scope[c.key] = {
		            		content: c.value,
		            		priority: c.priority,
		            		marker_img: "/assets/warn.png"
		            	};
		            }
		        }
		        if(c.key === 'h1_tags'){
		            $scope.h1_tags = {
		                content: c.value, priority: c.priority, limit: 0
		            };
		            if(c.value.length === 1) {
		                $scope.h1_tags.marker_img = "/assets/success.png";
		            } else {
		                $scope.h1_tags.marker_img = "/assets/warn.png";
		            }
		            if(c.value.length > 5) {
		                $scope.h1_tags.limit = 5;
		            } else {
		                $scope.h1_tags.limit = c.value.length;
		            }
		            if($scope.fileFormat === 'pdf') {
		            	$scope.h1_tags.limit = c.value.length;
		            }
		        }
		        if(c.key === 'img_tags'){
		            $scope.img_tags = {
		                total_img_tags: c.value.total, tags_without_alt: c.value.without_alt, 
		                priority: c.priority, limit: 0
		            };
		            if(c.value.without_alt.length === 0) {
		                $scope.img_tags.marker_img = "/assets/success.png";
		            } else {
		                if(c.value.without_alt.length > 5) {
		                    $scope.img_tags.limit = 5;
		                } else {
		                    $scope.img_tags.limit = c.value.without_alt.length;
		                }
		                if($scope.fileFormat === 'pdf') {
			            	$scope.img_tags.limit = c.value.without_alt.length;
			            }
		                $scope.img_tags.marker_img = "/assets/warn.png";
		            }
		        }
		        if(c.key === 'links'){
		            $scope.links = {
		                total_links: c.value.total, broken_links: c.value.broken_links, 
		                priority: c.priority, limit: 0
		            };
		            if(c.value.broken_links.length === 0) {
		                $scope.links.marker_img = "/assets/success.png";
		            } else {
		                if(c.value.broken_links.length > 5) {
		                    $scope.links.limit = 5;
		                } else {
		                    $scope.links.limit = c.value.broken_links.length;
		                }
		                if($scope.fileFormat === 'pdf') {
			            	$scope.links.limit = c.value.broken_links.length;
			            }
		                $scope.links.marker_img = "/assets/warn.png";
		            }
		        }
		        if(c.key === 'robots_txt'){
		            $scope.robots_txt = {
		                content: c.value, priority: c.priority, limit: 0
		            };
		            if (c.value) {
		            	$scope.robots_txt = {
			                content: "Detected with content:\n"+c.value, 
			                priority: c.priority, 
			                limit: 0,
			                marker_img: "/assets/success.png"
			            };
			            if(c.value.length > 300) {
		                    $scope.robots_txt.limit = 300;
		                } else {
		                    $scope.robots_txt.limit = c.value.length;
		                }
		                if($scope.fileFormat === 'pdf') {
			            	$scope.robots_txt.limit = c.value.length;
			            }
		            } else {
		                $scope.robots_txt.marker_img = "/assets/warn.png";
		            }
		        }
		        if(c.key === 'valid_sitemap'){
		            if(c.value.length > 0) {
		            	c.value.forEach(function(val) {
		            		$scope.valid_sitemap = {value: [], marker_img: "/assets/success.png"};
		            		$scope.valid_sitemap.value.push({
				                sitemap: val.sitemap, content: val.body, 
				                priority: c.priority, limit: val.body.length
				            });
				            if(val.body.length > 300) {
			                    $scope.valid_sitemap.value[$scope.valid_sitemap.value.length-1].limit = 300;
			                }
			                if($scope.fileFormat === 'pdf') {
				            	$scope.valid_sitemap.value[$scope.valid_sitemap.value.length-1].limit = val.body.length;
				            }
		            	});
		            } else {
		            	$scope.valid_sitemap = {marker_img: "/assets/warn.png", value: [
		            		{sitemap: '', content: '', priority: c.priority}
	            		]};
		            }
		        }
		        if(c.key === 'domain_age'){
		            
		            if (c.value) {
		                $scope.domain_age = {
			                content: secondsToString(c.value), priority: c.priority,
			                marker_img: "/assets/success.png"
			            };
		            } else {
		                $scope.domain_age = {marker_img: "/assets/warn.png"};
		            }
		        }
		        if(c.key === "webtest_different_location") {
		            if(c.value) {
		                $scope.webtest_different_location = {
		                	content: [],
		                	priority: c.priority,
		                	marker_img: "/assets/success.png"
		                };
		                for (var key in c.value) {
		                    var readable_key = key.substring(0, key.indexOf('- <b>'));
		                    $scope.webtest_different_location.content.push({key: key, value: c.value[key]});
		                }
		            } else {
		                $scope.webtest_different_location = {
		                	marker_img: "/assets/warn.png"
		                };
		            }
		        }
		        if(c.key === "google_snippet_screenshot") {
		            if(c.value) {
		            	$scope.google_snippet_screenshot = {
		            		content: "data:image/png;base64,"+c.value,
		            		priority: c.priority,
		            		marker_img: "/assets/success.png"
		            	};
		            } else {
		                $scope.google_snippet_screenshot = {
		                	marker_img: "/assets/warn.png"
		                };
		            }
		        }
		        if(c.key === 'img_bin_data') {
		            if(c.value) {
		                $rootScope.img_bin_data = "data:image/png;base64,"+c.value;
		            } else {
		            	$rootScope.img_bin_data = "fail";
		            }
		        }
		        if(c.key === 'web_spider') {
		        	$scope.web_spider = [];
		        	c.value.forEach(function(value) {
		        		var web_spider = {url: value.url};
		        		value.dom_checks.forEach(function(check) {
				            web_spider[check.key] = {
		        				content: check.value, priority: check.priority, marker_img: "/assets/success.png"//, limit: 5
		        			};
		        			if(check.value) {
		        				web_spider[check.key].total_img_tags = check.value.total;
		        				web_spider[check.key].tags_without_alt = check.value.without_alt;
		        			}
		        		});
		        		web_spider.links = {
		        			total_links: value.total_links, broken_links: value.broken_links, 
			                priority: "high", limit: 0
		        		};
		        		if(value.broken_links.length === 0) {
			                web_spider.links.marker_img = "/assets/success.png";
			            } else {/*
			                if(value.broken_links.length > 5) {
			                    web_spider.links.limit = 5;
			                } else {
			                    web_spider.links.limit = value.broken_links.length;
			                }*/
			                web_spider.links.marker_img = "/assets/warn.png";
			            }
			            $scope.web_spider.push(web_spider);
		        	});
		        }
		    };
		    $scope.smtp = false;
	        $scope.ftp = false;
	        $scope.mail = false;
	        $scope.last_modified = false;
	        $scope.google_analytics = false;
	        $scope.ya_metrika = false;
	        $scope.title_tag = false;
	        $scope.description_meta_tag = false;
	        $scope.h1_tags = false;
	        $scope.img_tags = false;
	        $scope.links = false;
	        $scope.robots_txt = false;
	        $scope.valid_sitemap = false;
	        $scope.domain_age = false;
	        $scope.main_mirror = false;
	        $scope.google_total_indexed_page = false;
	        $scope.yandex_total_indexed_page = false;
	        $scope.google_desktop_page_speed = false;
	        $scope.url = false;
	        $scope.google_mobile_page_speed = false;
	        $scope.google_desktop_page_screenshot = false;
	        $scope.google_mobile_page_screenshot = false;
	        $scope.google_mobile_page_usability = false;
	        $scope.webtest_different_location = false;
	        $scope.google_snippet_screenshot = false;
	        $scope.yandex_snippet_screenshot = false;
	        $scope.yandex_catalog = false;
	        $scope.main_mirror = false;
    		$scope.on_site_analysis = {group: "On-site analysis"};
    		$rootScope.img_bin_data = false;
    		$scope.web_spider = false;

    		var test_id = $routeParams.test_id;
    		
    		function fetch(test_id){
    			resultService.getResult(test_id)
    			.then(function(res) {
    				var json = JSON.parse(res);
    				if(json) {
    					if(json.statusCode === 200 && json.completed === 100) {
    						$rootScope.progressBarHide = true;
    						$scope.test_id = json.test_id;
    						$scope.url = json.test_url;
    					} else {
    						$timeout(function() {
    							fetch(test_id);
    						}, 5000); 
    					}
    					$rootScope.percentage_completed = json.completed;
	                    json.json.forEach(function(test) {
	                        passValuesToView(test);
	                    });
	                }
    			});
    		}

    		fetch(test_id);

        }]);
