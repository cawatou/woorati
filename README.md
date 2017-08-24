# WOORATI

Very affordable SEO web tool or service for your site for complete and thorough test analysis to help enhance your business reach your potential customers very effeciently.

## TECHNOLOGIES

**nodeJS**, **mongoDB** and **angularJS**

## SERVER SETUP

1. Install Linux(Ubuntu 14.04.3 LTS).
2. Install latest nodeJS server.
3. Install NPM.
4. Install MongoDB server. 
5. Install all the required nodejs modules using NPM.
6. Follow this [link](https://github.com/JustinTulloss/zeromq.node/wiki/Installation) to install zmq library.
7. Follow this [link](http://www.redminecrm.com/boards/36/topics/1467-wkhtmltopdf-installation-on-linux-to-work-with-invoices-plugin) to install wkhtmltopdf binary.
8. Install Forever module globally so to run nodejs app.

## AUTOMATION SETUP

1. Nodejs auto run script to restart on reboot.....


## SERVER SYSTEM ARCHITECTURE

	### The server or the master
		This handles all the http request, registration, payment and creating new test/tasks.
	### The scheduler or the task delegator
		This constantly looks for the available new or failed tasks and delegates them to the suitable and availbale worker/s.
	### The worker
		Workers they listen to delegator for any new tasks. The test analysis and all those heavy-long async process executes here.

## CLIENT SETUP

1. Setup angularjs and angular bootstrap.
2. PO edit and angular-gettext for multi language support.

## Contributors

[linkedIn](https://fi.linkedin.com/pub/prataksha-gurung/66/4a7/758) [Twitter](https://twitter.com/g3prataksha) 
emali: g3prataksha@gmail.com

## License

WOORATI © 2015