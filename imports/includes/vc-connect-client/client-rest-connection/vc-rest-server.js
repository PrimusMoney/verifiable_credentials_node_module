'use strict';

var VcRestServer = class {
	
	constructor(rest_full_url) {
		this.rest_full_url = rest_full_url;
	}
	
	getRestCallUrl() {
		return this.rest_full_url;
	}
	
	__isValidURL(url) {
		var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
					'((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
					'((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
					'(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
					'(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
					'(\\#[-a-z\\d_]*)?$','i'); // fragment locator
				
		return !!pattern.test(url);
	}
	
	_isReady() {
		var resturl = this.getRestCallUrl();
		
		return this.__isValidURL(resturl);
	}
	
	addToHeader(keyvalue) {
		this.header[keyvalue.key] = keyvalue.value;
	}
	
	_setRequestHeader(xhttp) {
		xhttp.setRequestHeader("Content-Type", "application/json"); // note: XMLHttpRequest in nodejs requires exact case
		
		for (var key in this.header) {
			xhttp.setRequestHeader(key, this.header[key]);
		}
	}

	_getXMLHttpRequestClass() {
		if (typeof XMLHttpRequest !== 'undefined' && XMLHttpRequest ) {
			return XMLHttpRequest;
		}
		else if (typeof window !== 'undefined' && window ) {
			// normally (browser or react native), XMLHttpRequest should be directly accessible
			if (typeof window.XMLHttpRequest !== 'undefined')
				return window.XMLHttpRequest;
			else if ( (typeof window.simplestore !== 'undefined')
					&& (typeof window.simplestore.XMLHttpRequest !== 'undefined'))
					return window.simplestore.XMLHttpRequest;
		}
		else if ((typeof global !== 'undefined') && (typeof global.simplestore !== 'undefined')
				&& (typeof global.simplestore.XMLHttpRequest !== 'undefined')) {
			return global.simplestore.XMLHttpRequest;
		}
		else {
			throw 'can not find XMLHttpRequest class!!!';
		}
	}
	
	_createXMLHttpRequest(method, resource) {
		var _XMLHttpRequest = this._getXMLHttpRequestClass()
		var xhttp = new _XMLHttpRequest();
		
		var rest_call_url = this.getRestCallUrl();
		var resource_url = rest_call_url + resource;
		
		// allow Set-Cookie for CORS calls
		//xhttp.withCredentials = true;
		
		xhttp.open(method, resource_url, true);

		this._setRequestHeader(xhttp);
		
		return xhttp;
	}

	async _processResponseText(xhttp) {
		var jsonresponse;
			
		try {
			jsonresponse = JSON.parse(xhttp.responseText);
		}
		catch(e) {
			console.log('rest answer is not json compliant: ' + xhttp.responseText);
		}
		
		if (jsonresponse) {
			const URL = require("url");
			let parsedUrl = URL.parse(xhttp.responseURL, true);
			let {query} = parsedUrl;

			// overload json if we are back from dummy redirect
			if (query && query.state)
				jsonresponse.state = (jsonresponse.state ? jsonresponse.state : query.state);

			if (query && query.code)
				jsonresponse.code = (jsonresponse.code ? jsonresponse.code : query.code);

		}
		else {
			// copy plain text
			jsonresponse = xhttp.responseText;
		}

		return jsonresponse;
	}
	
	async rest_get(resource) {
		var self = this;
		
		var xhttp = this._createXMLHttpRequest("GET", resource);
		
		xhttp.send();

		return new Promise((resolve, reject) => {
			xhttp.onload = function(e) {
				if (xhttp.status == 200) {
					self._processResponseText(xhttp)
					.then(response => {
						resolve(response);
					})
					.catch(err => {
						reject(err);
					});
				}
				else {
					reject(xhttp.statusText,);	
				}
			};
			
			xhttp.onerror = function (e) {
				reject(xhttp.statusText);
			};
		});

	}


	async service_version() {
		var resource = "/version";

		var res = await this.rest_get(resource);

		if (!res)
			throw('rest error calling ' + resource );
		else {
			if (res['error'])
				throw('rest error calling ' + resource + (res['error'] ? ': ' + res['error'] : ''));
			else
				return res['version'];
		}
	}

	async server_info() {
		var resource = "/server";

		var res = await this.rest_get(resource);

		if (!res)
			throw('rest error calling ' + resource );
		else {
			if (res['error'])
				throw('rest error calling ' + resource + (res['error'] ? ': ' + res['error'] : ''));
			else
				return res['data'];
		}
	}

	// static
	static getObject(rest_url) {
		if (!rest_url)
			return;

		let key = rest_url.toLowerCase();

		if (!VcRestServer.servers)
		VcRestServer.servers = {};

		if (VcRestServer.servers[key])
		return VcRestServer.servers[key];

		VcRestServer.servers[key] = new VcRestServer(rest_url);

		return VcRestServer.servers[key];
	}
}

module.exports = VcRestServer;
