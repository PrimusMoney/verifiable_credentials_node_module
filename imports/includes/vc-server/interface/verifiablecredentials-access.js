'use strict';

var VerifiableCredentialsServerAccess = class {
	
	constructor(session) {
		this.session = session;

		this.rest_connection = null;
	}
	
	_createRestConnection(rest_url) {
		const URL = require("url");

		var session = this.session;
		var global = session.getGlobalObject();

		let parsedUrl = URL.parse(rest_url, true);

		const rest_server_url = parsedUrl.protocol + '//' + parsedUrl.host;
		const rest_server_api_path = parsedUrl.path;

		const AsyncRestConnection = global.getModuleClass('crypto-did', 'AsyncRestConnection');
		let rest_connection = new AsyncRestConnection(this.session, rest_server_url, rest_server_api_path);
		
		return rest_connection;				
	}


	// rest connection
	_checkRestConnectionHeader() {
		if (!this.rest_connection)
			return;
			
		var rest_connection = this.rest_connection;

		var connection_header = rest_connection.getHeader();
		var session = this.session;

		var calltokenstring = connection_header['calltoken'];
		var calljson = (calltokenstring ? JSON.parse(calltokenstring) : {});

		// auth part (if any)
		if (session.authkey_server_access_instance && session.authkey_server_access_instance.rest_auth_connection) {
			var rest_auth_connection = session.authkey_server_access_instance.rest_auth_connection;

			if (rest_auth_connection._isReady()) {
				var authurl =  session.authkey_server_access_instance.rest_auth_connection.getRestCallUrl();
				
				if (authurl) {
					calljson.auth = authurl;
				}
			}
			
		}

		calltokenstring = JSON.stringify(calljson);
		rest_connection.addToHeader({key: 'calltoken', value: calltokenstring});
	}

	getRestConnection() {
		if (this.rest_connection)
			return this.rest_connection;
		
	    var rest_server_url = this.session.getXtraConfigValue('rest_server_url');
	    var rest_server_api_path = this.session.getXtraConfigValue('rest_server_api_path');

		var session = this.session;
		var global = session.getGlobalObject();
		
		const AsyncRestConnection = global.getModuleClass('crypto-did', 'AsyncRestConnection');
	    this.rest_connection = new AsyncRestConnection(session, rest_server_url, rest_server_api_path);
		
		// set Header
		this._checkRestConnectionHeader();
		
		return this.rest_connection;
	}
	
	setRestConnection(restconnection) {
		if (!restconnection)
			return;
		
		this.rest_connection = restconnection;

		// set Header
		this._checkRestConnectionHeader();
	}
	
	async rest_get(resource, callback) {
		var rest_connection = this.getRestConnection();
		
		return rest_connection.rest_get(resource, callback);
	}
	
	async rest_post(resource, postdata, callback) {
		var rest_connection = this.getRestConnection();
		
		return rest_connection.rest_post(resource, postdata, callback);
	}

	async rest_put(resource, postdata, callback) {
		var rest_connection = this.getRestConnection();
		
		return rest_connection.rest_put(resource, postdata, callback);
	}
	
	//
	// VerifiableCredentials Server API
	//
	

	// verifiable credentials microservice
	async vc_version(callback) {
		// obsolete
		this.service_version(callback);
	}

	async service_version() {
		console.log("VerifiableCredentialsServerAccess.service_version called");
		
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


	// user api
	async user_runtest() {
		console.log("VerifiableCredentialsServerAccess.user_runtest called");
		
		var resource = "/user/runtest";

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

	async user_wallets() {
		console.log("VerifiableCredentialsServerAccess.user_walets called");
		
		var resource = "/user/wallets";

		var res = await this.rest_get(resource);

		if (!res)
			throw('rest error calling ' + resource );
		else {
			if (res['error'])
				throw('rest error calling ' + resource + (res['error'] ? ': ' + res['error'] : ''));
			else
				return res['wallets'];
		}
	}

	async user_localstorage_get(keys) {
		var resource = "/user/localstorage/get";

		var postdata = {keys: JSON.stringify(keys)};

		var res = await this.rest_post(resource, postdata);

		if (!res)
			throw('rest error calling ' + resource );
		else {
			if (res['error'])
				throw('rest error calling ' + resource + (res['error'] ? ': ' + res['error'] : ''));
			else
				return res['value'];
		}
	}

	async user_localstorage_set(keys, value) {
		var resource = "/user/localstorage/set";

		var postdata = {keys: JSON.stringify(keys), value: JSON.stringify(value)};

		var res = await this.rest_post(resource, postdata);

		if (!res)
			throw('rest error calling ' + resource );
		else {
			if (res['error'])
				throw('rest error calling ' + resource + (res['error'] ? ': ' + res['error'] : ''));
			else
				return res['value'];
		}
	}

	//
	// vc api

	// openif_configuration
	async openid_credential_issuer() {
		var resource = "/.well-known/openid-credential-issuer";

		let res = await this.rest_get(resource);

		if (!res)
			throw('rest error calling ' + resource );
		else
			return res;
	}

	async openid_configuration() {
		let openid_credential_issuer = await this.openid_credential_issuer();

		const openid_config_url = openid_credential_issuer.authorization_server;
		let rest_connection_openid_credential_issuer = this._createRestConnection(openid_config_url);

		let resource = '/.well-known/openid-configuration';
		let res = await rest_connection_openid_credential_issuer.rest_get(resource);

		if (!res)
			throw('rest error calling ' + resource );
		else
			return res;
	}

	// credentials
	async credential_fetch(options) {
		// POST
		var resource = "/credential/fetch";

		var postdata = {options};

		var res = await this.rest_post(resource, postdata);

		if (!res)
			throw('rest error calling ' + resource );
		else {
			if (res['error'])
				throw('rest error calling ' + resource + (res['error'] ? ': ' + res['error'] : ''));
			else
				return res['credential'];
		}
	}

	async credential_restcall(resturl, method, resource, data) {
		// POST
		var _resource = "/credential/restcall";

		var postdata = {resturl, method, resource, data};

		var res = await this.rest_post(_resource, postdata);

		if (!res)
			throw('rest error calling ' + _resource );
		else {
/* 			if (res['error'])
				throw('rest error calling ' + _resource + (res['error'] ? ': ' + res['error'] : ''));
			else */
				return res;
		}
	}

	async credential_code_challenge(code_verifier) {
		// POST
		var resource = "/credential/codechallenge";

		var postdata = {code_verifier};

		var res = await this.rest_post(resource, postdata);

		if (!res)
			throw('rest error calling ' + resource );
		else {
			if (res['error'])
				throw('rest error calling ' + resource + (res['error'] ? ': ' + res['error'] : ''));
			else
				return res['code_challenge'];
		}
	}



	// issuer
	async issuer_datasource_add(client_id, client_key, name, endpoint, credential_type, nonce) {
		// POST
		var resource = "/issuer/datasource/add";

		var postdata = {client_id, client_key, name, endpoint, credential_type, nonce};

		var res = await this.rest_post(resource, postdata);

		if (!res)
			throw('rest error calling ' + resource );
		else {
			if (res['error'])
				throw('rest error calling ' + resource + (res['error'] ? ': ' + res['error'] : ''));
			else
				return res['datasource'];
		}
	}

	// verifier
	async verifier_datasink_add(client_id, client_key, name, endpoint, credential_type, nonce) {
		// POST
		var resource = "/verifier/datasink/add";

		var postdata = {client_id, client_key, name, endpoint, credential_type, nonce};

		var res = await this.rest_post(resource, postdata);

		if (!res)
			throw('rest error calling ' + resource );
		else {
			if (res['error'])
				throw('rest error calling ' + resource + (res['error'] ? ': ' + res['error'] : ''));
			else
				return res['datasink'];
		}
	}

	async verifier_verify(audience, idtoken, vptoken, options) {
		// POST
		var resource = "/verifier/verify";

		var postdata = {audience, idtoken, vptoken, options};

		var res = await this.rest_post(resource, postdata);

		if (!res)
			throw('rest error calling ' + resource );
		else {
			if (res['error'])
				throw('rest error calling ' + resource + (res['error'] ? ': ' + res['error'] : ''));
			else
				return res['verification'];
		}
	}

}


if ( typeof window !== 'undefined' && window ) // if we are in browser or react-native and not node js
	window.simplestore.VerifiableCredentialsServerAccess = VerifiableCredentialsServerAccess;
else if (typeof global !== 'undefined')
	global.simplestore.VerifiableCredentialsServerAccess = VerifiableCredentialsServerAccess; // we are in node js
