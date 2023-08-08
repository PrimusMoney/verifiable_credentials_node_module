class AsyncRestConnection {
	constructor(session, rest_server_url, rest_server_api_path) {
		this.session = session;
		
		this.rest_server_url = rest_server_url;
		this.rest_server_api_path = rest_server_api_path;

		this.rest_connection = session.createRestConnection(rest_server_url, rest_server_api_path);

		this.content_type = null;

		// modify rest_connection to call rest servers returning a status in jsonresponse
		// but which are not primus compliant

		// replace _processResponseText
		this.rest_connection._processResponseText = (xhttp, callback) => {
			if (callback) {
				var jsonresponse;
				
				try {
					jsonresponse = JSON.parse(xhttp.responseText);
				}
				catch(e) {
					console.log('rest answer is not json compliant: ' + xhttp.responseText);
				}

				if (jsonresponse) {
					if (xhttp.responseURL) {
						// enrich with state and code in case of 302 answer
						const URL = require("url");
						let parsedUrl = URL.parse(xhttp.responseURL, true);
						let {query} = parsedUrl;
	
						// overload json if we are back from dummy redirect
						if (query && query.state)
							jsonresponse.state = (jsonresponse.state ? jsonresponse.state : query.state);
	
						if (query && query.code)
							jsonresponse.code = (jsonresponse.code ? jsonresponse.code : query.code);
					}


					callback(null, jsonresponse);
				}
				else {
					// copy plain text
					jsonresponse = xhttp.responseText;
					
					callback(null, jsonresponse);
				}
			}
		};

		// replace _setRequestHeader
		this.rest_connection._setRequestHeader = (xhttp) => {
			if (this.content_type) {
				xhttp.setRequestHeader("Content-Type", this.content_type);
			}
			else {
				xhttp.setRequestHeader("Content-Type", "application/json"); // note: XMLHttpRequest in nodejs requires exact case
			}
			xhttp.setRequestHeader("sessiontoken", this.session.getSessionUUID());
			
			let header = this.rest_connection.header;
			for (var key in header) {
				xhttp.setRequestHeader(key, header[key]);
			}
		};

		// overload _createXMLHttpRequest
		/*const _org_createXMLHttpRequest = this.rest_connection._createXMLHttpRequest.bind(this.rest_connection);
		this.rest_connection._createXMLHttpRequest = (method, resource) => {
			let xhttp = _org_createXMLHttpRequest(method, resource);

			 if (this.content_type) {
				xhttp.setRequestHeader("Content-Type", this.content_type);
			} 

			return xhttp;
		}*/
	}

	addToHeader(keyvalue) {
		this.rest_connection.addToHeader(keyvalue);
	}

	getHeader() {
		return this.rest_connection.header;
	}

	_isInBrowser() {
		var session = this.session;
		var global = session.getGlobalObject();

		return global.isInBrowser();
	}

	_getHttpsClass() {
		//let https = require('https'); // for nodejs
		let https = require('https-browserify'); // for browser
		return https;
	}

	async rest_get_302(resource) {
 		return new Promise((resolve, reject) => { 
			let https = this._getHttpsClass();
			let rest_call_url = this.rest_connection.getRestCallUrl();
			let resource_url = rest_call_url + resource;

			let hostname = this.rest_connection.rest_server_url.substring(8);
			let path = this.rest_connection.rest_server_api_path + resource;
	
			var options = {
				hostname,
				port: 443,
				path,
				method: 'GET',
				headers: {
					'Access-Control-Allow-Origin': '*'
				}
			};

			var req = https.request(options, (res) => {
				if (res.statusCode > 300 && res.statusCode < 400 && res.headers.location) {
					// Detect a redirect
					let location = res.headers.location;
					const URL = require("url");
					let parsedUrl = URL.parse(location, true);
					let {query} = parsedUrl;

					resolve(query);
					
				} else {
					if (this._isInBrowser() == true) {
						// when we face a site with CORS restriction and
						// because we can not catch a 302 before 
						// "TypeError: Failed to fetch at ClientRequest._onFinish"
						// error, we redirect to the /.well-known/openid-configuration endpoint
						// to avoid a 404 and parse the query that we sent
						let requestUrl = res.url;
						const URL = require("url");
						let parsedUrl = URL.parse(requestUrl, true);
						let {query} = parsedUrl;
	
						resolve(query);
	
					}
					else{
						// Otherwise no redirect; capture the response as normal            
						let data = '';
				
						res.on('data', function (chunk) {
							data += chunk;
						}).on('end', function () {
							resolve(data);
						});
					}
				}
			});

			req.on('error', (e) => {
				reject(e);
			});

			req.end();
		});
	}

	async rest_post_302(resource, postdata) {
 		return new Promise((resolve, reject) => { 
			let https = this._getHttpsClass();
			let rest_call_url = this.rest_connection.getRestCallUrl();
			let resource_url = rest_call_url + resource;

			let hostname = this.rest_connection.rest_server_url.substring(8);
			let path = this.rest_connection.rest_server_api_path + resource;
	
			var options = {
				hostname,
				port: 443,
				path,
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					'Content-Length': postdata.length
				}
			};
			  
			var req = https.request(options, (res) => {

				if (res.statusCode > 300 && res.statusCode < 400 && res.headers.location) {
					// Detect a redirect
					let location = res.headers.location;
					const URL = require("url");
					let parsedUrl = URL.parse(location, true);
					let {query} = parsedUrl;

					resolve(query);
					
				} else {
					res.on('data', (d) => {
						resolve(d);
					});
				}
			});
				
			req.on('error', (e) => {
				reject(e);
			});

			
			req.write(postdata);
			req.end();
		});
	}


	async rest_get(resource, postdata) {
		var self = this.rest_connection;
		
		return new Promise((resolve, reject) => { 
			var xhttp = self._createXMLHttpRequest("GET", resource);
			
			if (postdata)
			xhttp.send(postdata);
			else
			xhttp.send();
			
			xhttp.onreadystatechange = () => {
				if (xhttp.status == 302) { 
					debugger;
				  }
			};
	
			xhttp.onload = function(e) {
				if ((xhttp.status == 200) ||  (xhttp.status == 201)) {
					self._processResponseText(xhttp, (err, res) => {
						if (err) reject(err); else resolve(res);
					});
				}
				else {
					let err = (xhttp.statusText && xhttp.statusText.length ? xhttp.statusText : xhttp.responseText);
					reject(err);	
				}
				
			};
			
			xhttp.onerror = function (e) {
				let err = (xhttp.statusText && xhttp.statusText.length ? xhttp.statusText : xhttp.responseText);
				console.log('rest error is ' + err);
				
				reject(err);	
			};
		});			
	}

	async rest_post(resource, postdata) {
		var self = this.rest_connection;
		
		return new Promise((resolve, reject) => { 
			var xhttp = self._createXMLHttpRequest("POST", resource);
			
			if (typeof postdata === 'string' || postdata instanceof String)
			xhttp.send(postdata);
			else
			xhttp.send(JSON.stringify(postdata));
			
			xhttp.onload = (e) => {
				if ((xhttp.status == 200) ||  (xhttp.status == 201)) {
					self._processResponseText(xhttp, (err, res) => {
						if (err) reject(err); else resolve(res);
					});
				}
				else {
					let err = (xhttp.statusText && xhttp.statusText.length ? xhttp.statusText : xhttp.responseText);
					reject(err);	
				}
				
			};
			
			xhttp.onerror = (e) => {
				let err = (xhttp.statusText && xhttp.statusText.length ? xhttp.statusText : xhttp.responseText);
				console.log('rest error is ' + err);
				
				reject(err);	
			};
		});
	}

	async rest_put(resource, postdata) {
		const result = new Promise((resolve, reject) => { 
			this.rest_connection.rest_put(resource, postdata, (err, res) => {
				if (err) reject(err); else resolve(res);
			});
		});
		
		return result;		
	}

	async rest_delete(resource) {
		const result = new Promise((resolve, reject) => { 
			this.rest_connection.rest_delete(resource, (err, res) => {
				if (err) reject(err); else resolve(res);
			});
		});
		
		return result;		
	}

}


if ( typeof window !== 'undefined' && typeof window.GlobalClass !== 'undefined' && window.GlobalClass ) {
	var _GlobalClass = window.GlobalClass;
}
else if (typeof window !== 'undefined') {
	var _GlobalClass = ( window && window.simplestore && window.simplestore.Global ? window.simplestore.Global : null);
}
else if (typeof global !== 'undefined') {
	// we are in node js
	var _GlobalClass = ( global && global.simplestore && global.simplestore.Global ? global.simplestore.Global : null);
}
_GlobalClass.registerModuleClass('crypto-did', 'AsyncRestConnection', AsyncRestConnection);