var app = angular.module('app', ['ui.bootstrap', 'ngRoute', /*'pascalprecht.translate', 'ngCookies', */'gettext']);

app.config(function($routeProvider) {
    $routeProvider
            .when('/', {
                templateUrl: 'templates/service_info.html'
            })
            .when('/testResult/:test_id', {
                controller: 'resultCtrl',
                templateUrl: 'templates/result.html'
            })
            .when('/registration', {
                controller: 'registrationCtrl',
                templateUrl: 'templates/registration.html'
            })  
            .when('/login', {
                controller: 'loginCtrl',
                templateUrl: 'templates/login.html'
            })
            .when('/subscription', {
                templateUrl: 'templates/subscription.html'
            })
            .otherwise({redirectTo: '/'});
    /*
    $translateProvider.useUrlLoader('/get_lang');
    // Tell the module what language to use by default
    $translateProvider.preferredLanguage('en');
    
    $translateProvider.useCookieStorage();
    
    $translateProvider.useSanitizeValueStrategy('escaped'); */
});

app.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.ngEnter);
                });
                event.preventDefault();
            }
        });
    };
});