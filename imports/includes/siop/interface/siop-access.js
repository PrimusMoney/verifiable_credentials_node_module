'use strict';

class SiopServerAccess {
	constructor(session) {
		this.session = session;
		
		this.rest_siop_connection = null;
	}
	
	getRestSiopConnection() {
		if (this.rest_siop_connection)
			return this.rest_siop_connection;
		
		var session = this.session;
		var global = session.getGlobalObject();
		var _globalscope = global.getExecutionGlobalScope();
		var Config = _globalscope.simplestore.Config;

		var rest_server_url = this.session.getXtraConfigValue('rest_server_url');
	    var rest_server_api_path = this.session.getXtraConfigValue('rest_server_api_path');
	    
    	// we look in Config to potentially overload default
		if (Config && (Config.get)  && (Config.get('siop_webapp_url')))
    		rest_server_url = Config.get('siop_webapp_url');

    	// api_path
    	if (Config && (Config.get)  && (Config.get('siop_webapp_api_path')))
    		rest_server_api_path = Config.get('siop_webapp_api_path');
    	else {
    		if (rest_server_api_path)
    			rest_server_api_path += '/oauth2';
    	}
    	
    	// we look at session's level to see if value has been overloaded at that level
    	var siop_rest_server_url = this.session.getXtraConfigValue('siop_webapp_url');
    	var siop_rest_server_api_path = this.session.getXtraConfigValue('siop_webapp_api_path');
    	
    	if (siop_rest_server_url && siop_rest_server_api_path) {
    		rest_server_url = siop_rest_server_url;
    		rest_server_api_path = siop_rest_server_api_path;
    	}

	    this.rest_siop_connection = this.session.createRestConnection(rest_server_url, rest_server_api_path);
		
		return this.rest_siop_connection;
	}
	
	setRestSiopConnection(restconnection) {
		if (!restconnection)
			return;
		
		this.rest_siop_connection = restconnection;
	}
	
	async rest_siop_get(resource) {
		var rest_connection = this.getRestSiopConnection();
		
		return new Promise((resolve, reject) => {
			rest_connection.rest_get(resource, (err, res) => {if (err) reject(err); else resolve(res);});
		});
	}
	
	rest_siop_post(resource, postdata, callback) {
		var rest_connection = this.getRestSiopConnection();
		
		return new Promise((resolve, reject) => {
			rest_connection.rest_post(resource, postdata, (err, res) => {if (err) reject(err); else resolve(res);});
		});
	}
	
	//
	// rest Siop API
	//
	async siop_server_info() {
		console.log("SiopServerAccess.siop_server_info called");
		
		var resource = "/server";
			
		var res = await this.rest_siop_get(resource);

		var serverinfo = res.data;

		return serverinfo;
	}

	async siop_initialize_session(params) {
		console.log("SiopServerAccess.siop_initialize_session called");
		
		var initialization;

		var nonce = (params && params.nonce ? params.nonce : null);

		try {
			let resource = "/initialize";

			resource += (nonce ? '?nonce=' + nonce : '');

			let res = await this.rest_siop_get(resource);

			initialization = (res ? res.data : null);
		}
		catch(e) {
			console.log('rest exception: ' + e);
		}

		return initialization;
	}

	_getTimeStamp() {
		return Math.floor(Date.now() / 1000);
	}

	async _getEthrKid(keyuuid, alg) {
		var session = this.session;
		var global = session.getGlobalObject();

		let cryptokeyblockmodule = global.getModuleObject('cryptokey-block');
		let cryptokeyblockinterface = cryptokeyblockmodule.getCryptoKeyBlockInterface();

		let aes_pub_keys = await cryptokeyblockinterface.getPublicKeys(session, {keyuuid, curve: 'secp256k1'});

		const kid = 'did:ethr:' + aes_pub_keys.address + '#owner1';

		return kid;
	}

	async _getKeyKid(keyuuid, alg) {
		var session = this.session;
		var global = session.getGlobalObject();

		const Did = global.getModuleClass('crypto-did', 'Did');
		const did = Did.getObject(session, keyuuid);
		
		var kid = await did.getKid(alg, 'key', 'natural');

		return kid;
	}

	async _getEbsiKid(keyuuid, alg) {
		var session = this.session;
		var global = session.getGlobalObject();

		const Did = global.getModuleClass('crypto-did', 'Did');
		const did = Did.getObject(session, keyuuid);
		
		var kid = await did.getKid(alg, 'ebsi', 'natural');

		return kid;
	}

	async _createIdToken(nonce, challenge, keyuuid, alg, did_method) {
		var session = this.session;
		var global = session.getGlobalObject();

		var rest_connection = this.getRestSiopConnection();

		// build header
		var header = {};

		header.typ = 'jwt';

		const CryptoKeys = global.getModuleClass('crypto-did', 'JwCryptoKeys');
		const cryptokeys = CryptoKeys.getObject(session);
		const keySet = await cryptokeys.getKeySet(keyuuid, alg);

		let jwkPubKey = keySet.jwkKeyPair.publicKey;

		header.alg = alg;
		header.jwk = {crv: jwkPubKey.crv, kty: jwkPubKey.kty, x: jwkPubKey.x, y: jwkPubKey.y};

		switch(did_method) {
			case 'ethr':
				header.kid = await this._getEthrKid(keyuuid, alg);
				break;

			case 'key':
				header.kid = await this._getKeyKid(keyuuid, alg);
				break;

			case 'ebsi':
				header.kid = await this._getEbsiKid(keyuuid, alg);
				break;

			default:
				header.kid = await this._getEthrKid(keyuuid, alg);
				break;

		}


		// build body

		let body = {};

		body.iss = header.kid;
		body.aud = rest_connection.getRestCallUrl();
		body.nonce = nonce;
		body.challenge = challenge;
		body.iat = this._getTimeStamp();

		// build id token
		let jwtoken;

		switch(alg) {
			case 'ES256K': {
				const Utils = global.getModuleClass('crypto-did', 'Utils');

				let cryptokeyblockmodule = global.getModuleObject('cryptokey-block');
				let cryptokeyblockinterface = cryptokeyblockmodule.getCryptoKeyBlockInterface();

				// custom token and signature for the moment, matching our siop server verification process

				let aes_pub_keys = await cryptokeyblockinterface.getPublicKeys(session, {keyuuid, curve: 'secp256k1'});
				header.address =  aes_pub_keys.address;

				let tk_str = Utils.encodebase64(JSON.stringify(header)) + '.' + Utils.encodebase64(JSON.stringify(body));

				let signature = await cryptokeyblockinterface.signString(session, tk_str, {keyuuid, curve: 'secp256k1'});

				jwtoken = tk_str + '.' + signature;
			}
			break;

			case 'ES256': {
				const JWT = global.getModuleClass('crypto-did', 'JWT');
				const jwt = JWT.getObject(session, header, body);
		
				jwtoken = await jwt.createJWT(keyuuid, alg);
			}
			break

			default:
				return Promise.reject('algorithm not suppported: ' + alg);
		}


		return jwtoken;
	}
	
	async siop_impersonate_session(params) {
		console.log("SiopServerAccess.siop_impersonate_session called");
		
		var impersonation;

		let keyuuid = params.keyuuid;
		let nonce = (params && params.nonce ? params.nonce : null);
		let challenge = (params && params.challenge ? params.challenge : null);
		let alg = (params && params.alg ? params.alg : 'ES256');
		let did_method = (params && params.did_method ? params.did_method : 'ethr');


		try {
			const id_token = await this._createIdToken(nonce ,challenge, keyuuid, alg, did_method);

			let resource = "/impersonate";

			let postdata = {};

			postdata['provider'] = 'siop';
			postdata['access_token'] = JSON.stringify({id_token});
			postdata['nonce'] = nonce;

			let res = await this.rest_siop_post(resource, postdata);

			impersonation = {};
			impersonation.isanonymous = (res && res.data ? res.data.isanonymous : true);
			impersonation.isauthenticated = (res && res.data ? res.data.isauthenticated : false);
			impersonation.sessionuuid = (res && res.data ? res.data.sessionuuid : false);
			impersonation.state = (res && res.data ? res.data.state : false);
			impersonation.provider = (res && res.data ? res.data.provider : false);
			impersonation.useruuid = (res && res.data ? res.data.useruuid : true);
			impersonation.nonce = (res && res.data ? res.data.nonce : true);

		}
		catch(e) {
			console.log('exception in siop_impersonate_session: ' + e);
		}

		return impersonation;
	}
	
	

}

console.log("SiopServerAccess is loaded");

if ( typeof window !== 'undefined' && window ) // if we are in browser or react-native and not node js (e.g. truffle)
	window.simplestore.SiopServerAccess = SiopServerAccess;
else if (typeof global !== 'undefined')
	global.simplestore.SiopServerAccess = SiopServerAccess; // we are in node js
