app
    .service('registrationService', function($q) {
        this.register = function(params) {
            var defer = $q.defer();
            
            
            var xhr = new XMLHttpRequest();
            
            xhr.open("POST", "/register", true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.onload = function () {
                //console.log("response finished "+xhr.status+": ", xhr.responseText);
                if(xhr.status === 200) {
                    defer.resolve(xhr.responseText);
                } else {
                    defer.reject(xhr.responseText);
                }
            };
            
            xhr.onerror = function () {
                defer.reject("Server/Network Error!");
            };
            xhr.send(JSON.stringify(params));
            
            return defer.promise;
        };
        
        return this;
        
        
    });