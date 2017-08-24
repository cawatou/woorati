var request = require('request'), cheerio = require('cheerio');

//Загружаем страницу
request({uri:'http://habrahabr.ru/post/210996/', method:'GET', encoding:'binary'},
    function (err, res, page) {    	
    	console.log(1);
        //Передаём страницу в cheerio
        var $=cheerio.load(page);
        //Идём по DOM-дереву обычными CSS-селекторами
        meta=$('meta[name^="twitter"]').each(function(){
        	console.log('+');
        });    
    });