app
    .service('mainService', function($q) {
        console.log($q);
        this.go = function(param) {
            var defer = $q.defer();
            /*
            $http.get('go', {params: {"q": url}})
                .success(function(res){
                    this['res'] = res;
                    console.log(res);
                    defer.resolve(res);
                })
                .error(function(err, status) {
                    defer.reject(err);
                });
            */
            
            
            var xhr = new XMLHttpRequest();
            
            xhr.open("GET", "/find_meta?q="+param.url+"&email="+param.email, true);
            /*
            xhr.onprogress = function () {
                //console.log("PROGRESS "+xhr.status+": ", xhr.responseText);
                defer.notify(xhr.responseText.split(chunk_splitter));
            };
            */
            xhr.onload = function () {
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