app
    .service('resultService', function($q) {
        this.getResult = function(test_id) {
            var defer = $q.defer();
            
            var xhr = new XMLHttpRequest();
            
            xhr.open("GET", "/test/"+test_id, true);
            
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
            xhr.send();
            
            return defer.promise;
        };
        
        return this;
        
        
    });