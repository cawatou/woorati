app
    .controller('loginCtrl', ['$scope', '$rootScope', 'loginService', 'gettextCatalog',
        function($scope, $rootScope, loginService, gettextCatalog) {
        	$scope.login = {
        		email: "",
        		password: "",
        		go: function() {
        			var params = {
        				email: $scope.login.email,
        				password: $scope.login.password
        			};
        			loginService.logIn(params)
        				.then(function(data) {
                            window.location.href = "/";
        					$scope.login.error = undefined;
        				}, function(err) {
        					console.log(err);
        					$scope.login.error = "Login Failed!";
                            $scope.login_error_alerts = [
                                {type: 'danger', msg: "login failed! Icorrect email/password. Please try again."}
                            ];
        				});
        		}
        	};
            $scope.closeLogin_error_alert = function(index) {
                $scope.login_error_alerts.splice(index, 1);
            };
        }
    ]);