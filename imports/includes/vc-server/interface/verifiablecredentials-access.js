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

	// openid_configuration
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

	// support because of limitations on browser
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
	// END support because of limitations on browser



	//
	// issuer

	// pre-authorization (used by data server, requires api_secret)
	async issuer_credential_preauthorize(client_id, client_key, token, tokentype, api_secret) {
		// POST
		var resource = '/issuer/credential/preauthorize';

		var postdata = {client_id, client_key, token, tokentype, api_secret};

		var res = await this.rest_post(resource, postdata);

		if (!res)
			throw('rest error calling ' + resource );
		else {
			if (res['error'])
				throw('rest error calling ' + resource + (res['error'] ? ': ' + res['error'] : ''));
			else
				return res;
		}	
	}

	// pre-initiation (used by widget)
	async issuer_credential_authorization_token_status(client_id, client_key, token, tokentype) {
		// POST
		var resource = '/issuer/credential/authorization-token';

		var postdata = {client_id, client_key, token, tokentype};

		var res = await this.rest_post(resource, postdata);

		if (!res)
			throw('rest error calling ' + resource );
		else {
			if (res['error'])
				throw('rest error calling ' + resource + (res['error'] ? ': ' + res['error'] : ''));
			else
				return res;
		}
	}

	//async issuer_credential_prerequest(client_id, client_key, credential_type, nonce, issuer_did, client_did) {
	async issuer_credential_prerequest(issuer, client, credentials, nonce) {

		var resource = '/issuer/credential/prerequest';


		if (typeof issuer === 'string' || issuer instanceof String) {
			// legacy call

			// GET
			let client_id = arguments[0];
			let client_key = arguments[1];
			let credential_type = arguments[2];
			let nonce = arguments[3];
			let issuer_did = arguments[4];
			let client_did = arguments[5];

			resource += '?client_id=' + client_id;
			resource += '&client_key=' + client_key;
			resource += '&credential_type=' + credential_type;
			resource += '&nonce=' + nonce;
			resource += (issuer_did ? '&issuer_did=' + issuer_did : '');
			resource += (client_did ? '&client_did=' + client_did : '');

			let res = await this.rest_get(resource);

			if (!res)
				throw('rest error calling ' + resource );
			else {
				if (res['error'])
					throw('rest error calling ' + resource + (res['error'] ? ': ' + res['error'] : ''));
				else
					return res;
			}
		}
		else {
			// POST
			let postdata = {issuer, client, credentials, nonce};

			let res = await this.rest_post(resource, postdata);

			if (!res)
				throw('rest error calling ' + resource );
			else {
				if (res['error'])
					throw('rest error calling ' + resource + (res['error'] ? ': ' + res['error'] : ''));
				else
					return res;
			}
		}


	}

	//async issuer_datasource_add(client_id, client_key, name, endpoint, credential_type, nonce, issuer_did, client_did) {
	async issuer_datasource_add(issuer, client, datasource, credentials, nonce) {
		// POST
		var resource = "/issuer/datasource/add";

		var postdata;

		if (typeof issuer === 'string' || issuer instanceof String) {
			// legacy call
			let client_id = arguments[0];
			let client_key = arguments[1];
			let name = arguments[2];
			let endpoint = arguments[3];
			let credential_type = arguments[4];
			let nonce = arguments[5];
			let issuer_did = arguments[6];
			let client_did = arguments[7];

			postdata = {client_id, client_key, name, endpoint, credential_type, nonce, issuer_did, client_did};
		}
		else {
			postdata = {issuer, client, datasource, credentials, nonce};
		}

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

	// post initiation (used by wallet)

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

	

	//
	// verifier

	// pre-authorization (used by data server, requires api_secret)
	async verifier_credential_preauthorize(client_id, client_key, token, tokentype, api_secret) {
		// POST
		var resource = '/verifier/credential/preauthorize';

		var postdata = {client_id, client_key, token, tokentype, api_secret};

		var res = await this.rest_post(resource, postdata);

		if (!res)
			throw('rest error calling ' + resource );
		else {
			if (res['error'])
				throw('rest error calling ' + resource + (res['error'] ? ': ' + res['error'] : ''));
			else
				return res;
		}	
	}

	// pre-initiation (used by widget)
	async verifier_credential_authorization_token_status(client_id, client_key, token, tokentype) {
		// POST
		var resource = '/verifier/credential/authorization-token';

		var postdata = {client_id, client_key, token, tokentype};

		var res = await this.rest_post(resource, postdata);

		if (!res)
			throw('rest error calling ' + resource );
		else {
			if (res['error'])
				throw('rest error calling ' + resource + (res['error'] ? ': ' + res['error'] : ''));
			else
				return res;
		}
	}

	//async verifier_credential_prerequest(client_id, client_key, credential_type, nonce) {
	async verifier_credential_prerequest(verifier, client, credentials, nonce) {
		let resource = '/verifier/credential/prerequest';

		if (typeof verifier === 'string' || verifier instanceof String) {
			// legacy call
			let client_id = arguments[0];
			let client_key = arguments[1];
			let credential_type = arguments[2];
			let nonce = arguments[3];

			// GET
			resource += '?client_id=' + client_id;
			resource += '&client_key=' + client_key;
			resource += '&credential_type=' + credential_type;
			resource += '&nonce=' + nonce;

			let res = await this.rest_get(resource);

			if (!res)
				throw('rest error calling ' + resource );
			else {
				if (res['error'])
					throw('rest error calling ' + resource + (res['error'] ? ': ' + res['error'] : ''));
				else
					return res;
			}
		}
		else {
			// POST
			let postdata = {verifier, client, credentials, nonce};

			let res = await this.rest_post(resource, postdata);

			if (!res)
				throw('rest error calling ' + resource );
			else {
				if (res['error'])
					throw('rest error calling ' + resource + (res['error'] ? ': ' + res['error'] : ''));
				else
					return res;
			}
		}
	}

	//async verifier_datasink_add(client_id, client_key, name, endpoint, credential_type, nonce) {
	async verifier_datasink_add(verifier, client, datasink, credentials, nonce) {
		// POST
		var resource = "/verifier/datasink/add";

		var postdata;
		
		if (typeof verifier === 'string' || verifier instanceof String) {
			// legacy call
			let client_id = arguments[0];
			let client_key = arguments[1];
			let name = arguments[2];
			let endpoint = arguments[3];
			let credential_type = arguments[4];
			let nonce = arguments[5];

			postdata = {client_id, client_key, name, endpoint, credential_type, nonce};
		}
		else {
			postdata = {verifier, client, datasink, credentials, nonce};
		}

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

	// post initiation (used by wallet)
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
