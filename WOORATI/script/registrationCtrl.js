app
    .controller('registrationCtrl', ['$scope', '$rootScope', 'registrationService', 'gettextCatalog',
        function($scope, $rootScope, registrationService, gettextCatalog) {
        	$scope.registration = {
        		full_name: "",
        		password: "",
        		repeat_password: "",
        		email: "",
        		phone: "",
        		register: function() {
        			var params = {
        				name: $scope.registration.full_name,
        				password: $scope.registration.repeat_password,
        				email: $scope.registration.email,
        				phone: $scope.registration.phone
        			};
        			registrationService.register(params)
        				.then(function(data) {
        					$scope.registration_error_alerts = [
                                {type: 'success', msg: "Registration successfull. You will shortly recieve an email from us for further confirmation!"}
                            ];
        				}, function(err) {
        					console.log(err);
        					$scope.registration_error_alerts = [
                                {type: 'danger', msg: err}
                            ];
        				});
        		}
        	};

            $scope.closeRegistration_error_alert = function(index) {
                $scope.registration_error_alerts.splice(index, 1);
            };
        }
    ]);