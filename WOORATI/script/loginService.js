app
    .service('loginService', function($q) {
        this.logIn = function(params) {
            var defer = $q.defer();
            
            
            var xhr = new XMLHttpRequest();
            if(params.email && params.password) {
                xhr.open('POST', '/login', true);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.send(JSON.stringify(params));
            }
            xhr.onload = function () {
                //console.log("response finished "+xhr.status+": ", xhr.responseText);
                if(xhr.status === 200) {
                    console.log(xhr.responseText);
                    defer.resolve(xhr.responseText);
                } else {
                    console.log(xhr.responseText);
                    defer.reject(xhr.responseText);
                }
            };
            
            xhr.onerror = function () {
                defer.reject("Server/Network Error!");
            };
            
            return defer.promise;
        };
        
        return this;
        
        
    });