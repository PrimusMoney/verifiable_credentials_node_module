//import { createJWT, ES256KSigner, ES256Signer, hexToBytes } from 'did-jwt'; // create problems when in node.js

class Did {

	constructor(session, keyuuid) {
		this.session = session;

		this.keyuuid = keyuuid;

		this.rest_url = null;
	}

	_getUtilsClass() {
		if (this.UtilsClass)
		return this.UtilsClass;

		let global = this.session.getGlobalObject();
		
		this.UtilsClass = global.getModuleClass('crypto-did', 'Utils');

		return this.UtilsClass;
	}

	_getCryptoKeysObject() {
		var session = this.session;
		var global = session.getGlobalObject();
		var cryptodidmodule = global.getModuleObject('crypto-did');

		const CryptoKeys = global.getModuleClass('crypto-did', 'JwCryptoKeys');
		const cryptokeys = CryptoKeys.getObject(session);

		return cryptokeys;
	}

	async createDidJWT(header, payload, alg) {
		let keySet = await this._getKeySet(alg);

		//const didJWT = require('did-jwt'); // returns path to "/my-did-wallet/static/media/index.c63b8054ea38e87f580d.cjs"
		const didJWT = await import('did-jwt');
		const { createJWT, ES256KSigner, ES256Signer, hexToBytes } = didJWT;

		if (!createJWT)
			return Promise.reject('problem importing createJWT');

		const cryptokeys = this._getCryptoKeysObject();

		let privateJwk = keySet.jwkKeyPair.privateKey;
		let publicJwk = keySet.jwkKeyPair.publicKey;

		let privkey = await cryptokeys.exportHexadecimalPrivateKey(privateJwk);

		let signingAlg = privateJwk.alg;
		let signer;

		switch(signingAlg) {
			case 'ES256': {
				signer = ES256Signer(hexToBytes(privkey));
			}
			break;
			case 'ES256K': {
				signer = ES256KSigner(hexToBytes(privkey));
			}
			break;
			default:
				throw new Error(`Algorithm ${signingAlg} not supported`);

		}

		let _header = Object.assign({}, header);
		let _body = Object.assign({}, payload);

		_header.alg = signingAlg;
		_header.jwk = publicJwk;

		let did = await this.getDid(alg);

		let options = {
			alg: _header.alg,
			issuer: did,
			signer,
			canonicalize: true,
		};

		let jwt = await createJWT(_body, options,_header);

		return jwt;

	}

	async getDid(alg, method, type) {
		let keySet = await this._getKeySet(alg);

		const jose = require('jose');
		const Utils = this._getUtilsClass();

		const publicKeyJwkAgent = keySet.jwkKeyPair.publicKey;

		switch(method) {
			case 'ethr': {
				return Promise.reject('did:ethr not implemented yet!');
			}

			default:
			case 'ebsi': {
				if (method && method != 'ebsi')
					return Promise.reject('method is not supported: ' + method);

				if (type && type != 'natural')
					return Promise.reject('type is not supported: ' + type);

				const thumbprint = await jose.calculateJwkThumbprint(publicKeyJwkAgent, "sha256");

				let subject_id = Utils.encodehex(jose.base64url.decode(thumbprint));
				const did = `did:ebsi:${Utils.encodebase58btc('02' + subject_id.split('x')[1], 'hex')}`; // '02' for natural person
		
				return did;
			}
		}


	}

	async getKid(alg, method, type) {
		let keySet = await this._getKeySet(alg);

		const jose = require('jose');

		const did = await this.getDid(alg, method, type);

		switch(method) {
			case 'ethr': {
				const kid = `${did}#owner1`;
		
				return kid;
			}

			default:
			case 'ebsi': {
				const publicKeyJwkAgent = keySet.jwkKeyPair.publicKey;

				const thumbprint = await jose.calculateJwkThumbprint(publicKeyJwkAgent, "sha256");
		
				const kid = `${did}#${thumbprint}`;
		
				return kid;
			}
		}
	}

	async _createJWT(header, body, alg) {
		var session = this.session;
		var global = session.getGlobalObject();

		const JWT = global.getModuleClass('crypto-did', 'JWT');
		const jwt = JWT.getObject(session, header, body)

		return jwt.createJWT(this.keyuuid, alg)
	}

	async _decodeJWT(jwt) {
		var session = this.session;
		var global = session.getGlobalObject();

		const JWT = global.getModuleClass('crypto-did', 'JWT');
		return JWT.decodeJWT(jwt);
	}
	
	async decodeDidJWT(jwt) {
		const jose = require('jose');

		let data = await jose.decodeJwt(jwt)
		.catch( err => {
			console.log('error in decodeDidJWT: ' + err);
		});

		return data;
	}

	// key support functions
	_getTimeStamp() {
		return Math.floor(Date.now() / 1000);
	}

	_getJwkKeyAlg(publicJwk) {
		const cryptokeys = this._getCryptoKeysObject();
		return cryptokeys.getJwkKeyAlg(publicJwk);
	}

	async _getKeySet(alg) {
		let keyuuid = this.keyuuid;
		const cryptokeys = this._getCryptoKeysObject();
		return cryptokeys.getKeySet(keyuuid, alg);
	}

	async getNaturalPersonAgent(alg) {
		var session = this.session;
		var global = session.getGlobalObject();
		const Utils = global.getModuleClass('crypto-did', 'Utils');

		const EbsiSiop = require('@cef-ebsi/siop-auth');
		const EbsiWalib = require('@cef-ebsi/wallet-lib');
		const jose = require('jose');


		let { Agent } = EbsiSiop;
		let { EbsiWallet } = EbsiWalib;
		let { calculateJwkThumbprint, exportJWK, JWK } = jose;
		
		let keySet = await this._getKeySet(alg);

		const publicKeyJwkAgent = keySet.jwkKeyPair.publicKey;

		const thumbprint = await calculateJwkThumbprint(publicKeyJwkAgent, "sha256");

		let didAgent;

		if (keySet.did) {
			didAgent = keySet.did;
		}
		else {
			let subject_id = Utils.encodehex(jose.base64url.decode(thumbprint));
			didAgent = `did:ebsi:${Utils.encodebase58btc('02' + subject_id.split('x')[1], 'hex')}`; // '02' for natural person
		}

		const kidAgent = `${didAgent}#${thumbprint}`;
		let privateKey;

		switch(alg) {
			case 'ES256': {
				privateKey = keySet.cryptoKeyPair.privateKey;
			}
			break;

			case 'ES256K': {
				let javascript_env = global.getJavascriptEnvironment();
				let jwkPrivateKey = keySet.jwkKeyPair.privateKey;
		
				if (javascript_env != 'browser')
				privateKey = await jose.importJWK(jwkPrivateKey);
				else {
					return Promise.reject('jose.importJWK does not support ES256K on the browser');
				}
			}
			break;

			default:
				return Promise.reject('does not support alg: ' + alg);
		}

		const agent = new Agent({
		  privateKey,
		  alg,
		  kid: kidAgent,
		  siopV2: true,
		});

		return agent;
	}

	_createRestConnection(rest_url) {
		const URL = require("url");

		var session = this.session;
		var global = session.getGlobalObject();

		let rst_url = (rest_url ? rest_url : this.rest_url);
		let parsedUrl = URL.parse(rst_url, true);

		const rest_server_url = parsedUrl.protocol + '//' + parsedUrl.host;
		const rest_server_api_path = parsedUrl.path;

		const AsyncRestConnection = global.getModuleClass('crypto-did', 'AsyncRestConnection');
		let rest_connection = new AsyncRestConnection(this.session, rest_server_url, rest_server_api_path);
		
		return rest_connection;				
	}

	// calling 3rd party
	async fetchInitiationUrl(options) {
		let rest_url = options.rest_url;

		let params = options;

		let test = {};
		let resource;

		switch (options.method) {
			case 'initiate_issuance': {
				let rest_connection_initiate_issuance = this._createRestConnection(rest_url);

				rest_connection_initiate_issuance.addToHeader({key: 'conformance', value: params.conformance});
		
				// cross
				resource = '/issuer-mock/initiate';
				resource += '?conformance=' + params.conformance;
				resource += '&credential_type=' + (params.credential_type ? params.credential_type : 'verifiable-id');
				resource += '&flow_type=' + (params.flow_type == 'same-device' ? 'same-device' : 'cross-device');
		
				test.initiate_issuance = await rest_connection_initiate_issuance.rest_get(resource);

				return (test.initiate_issuance ? test.initiate_issuance : null);
			}
			break;

			case 'initiate_verification': {
				let rest_connection_initiate_verification = this._createRestConnection(rest_url);

				rest_connection_initiate_verification.addToHeader({key: 'conformance', value: params.conformance});
				
				// cross
				resource = '/authentication-requests';
				resource += '?conformance=' + params.conformance;
				resource += '&flow_type=' + (params.flow_type == 'same-device' ? 'same-device' : 'cross-device');
				resource += '&scheme=openid';
		
				test.initiate_verification = await rest_connection_initiate_verification.rest_get(resource);
			
				return (test.initiate_verification ? test.initiate_verification : null);
			}
			break;

			default:
				break;
		}
	}


	async fetchVerifiableCredential(options) {
		var session = this.session;
		var global = session.getGlobalObject();
		const Utils = global.getModuleClass('crypto-did', 'Utils');

		const alg = (options.alg ? options.alg : 'ES256');

		let rest_url = options.rest_url;

		let test = {};

		let resource;
		let postdata;
		let plain_str;
		let enc_str;

		let params = options;

		const sessionuuid = this.session.getSessionUUID();

		//
		// test health
		let rest_connection_health = this._createRestConnection(rest_url);

		resource = '/health';
		test.health = await rest_connection_health.rest_get(resource);



		//
		// authorize
		let rest_connection_authorize = this._createRestConnection(rest_url);

		resource = '/issuer-mock/authorize';
		resource += '?scope=openid';
		resource += '&response_type=code';
		resource += '&state='+ sessionuuid;

		plain_str = 'https://oauth2.primusmoney.com/erc20-dapp/api/oauth2';
		enc_str = encodeURIComponent(plain_str);
		resource += '&redirect_uri=' + enc_str;

		plain_str = 'https://oauth2.primusmoney.com/erc20-dapp/api/oauth2&sessionuuid='+ sessionuuid;
		enc_str = encodeURIComponent(plain_str);
		resource += '&client_id=' + enc_str;

		plain_str = JSON.stringify([{credential_type:params.credential_type,format: 'jwt_vc',locations:null,type: 'openid_credential'}]);
		enc_str = encodeURIComponent(plain_str);
		resource += '&authorization_details=' + enc_str;

		resource += '&conformance=' + params.conformance;
		//postdata = {conformance: params.conformance}; // passsing conformance in body to appear in EBSI's logs


		test.authorize = await rest_connection_authorize.rest_get(resource);

		if (!test.authorize.code)
			return Promise.reject('could not retrieve authorization code');

		//
		// token
		let rest_connection_token = this._createRestConnection(rest_url);
		
		rest_connection_token.addToHeader({key: 'conformance', value: params.conformance});

		resource = '/issuer-mock/token';

		rest_connection_token.content_type = 'application/x-www-form-urlencoded';
		plain_str = 'https://oauth2.primusmoney.com/erc20-dapp/api/oauth2';
		enc_str = encodeURIComponent(plain_str);

		postdata = 'grant_type=authorization_code';
		postdata += '&code=' + test.authorize.code;
		postdata += '&redirect_uri=' + enc_str;

		test.token = await rest_connection_token.rest_post(resource, postdata);

		if (!test.token.access_token)
			return Promise.reject('could not retrieve access token');


		//
		// credential
		let rest_connection_credential = this._createRestConnection(rest_url);

		rest_connection_credential.addToHeader({key: 'Authorization', value: test.token.token_type + ' ' + test.token.access_token});

		rest_connection_credential.addToHeader({key: 'conformance', value: params.conformance});

 		resource = '/issuer-mock/credential';

		postdata = {};
		postdata.format = 'jwt_vc';
		postdata.type = params.credential_type;
		//postdata.access_token = test.token.access_token;
		postdata.c_nonce = test.token.c_nonce;
		postdata.c_nonce_expires_in = test.token.expires_in;
		//postdata.id_token = test.token.id_token;

		// building jwt
		let header = {};

		header.typ = 'jwt';

		let keySet = await this._getKeySet(alg);
		let jwkPubKey = keySet.jwkKeyPair.publicKey;

		header.alg = this._getJwkKeyAlg(jwkPubKey);
		header.jwk = {crv: jwkPubKey.crv, kty: jwkPubKey.kty, x: jwkPubKey.x, y: jwkPubKey.y};

		const agent = await this.getNaturalPersonAgent(alg);
		const kid = agent.kid;

		header.kid = kid;

		let body = {};

		body.iss = header.kid;
		body.aud = params.issuer;
		body.nonce = test.token.c_nonce;
		body.iat = this._getTimeStamp();

		//let jwt = await this._createJWT(header, body, header.alg);
		let jwt = await this.createDidJWT(header, body, alg)
		.catch(err => {
			console.log(err)
		});


		postdata.proof = {};
		postdata.proof.proof_type = 'jwt';
		postdata.proof.jwt = jwt;

		//postdata.credential = jwt;

		//test.credential = await rest_connection_credential.rest_post(resource, JSON.stringify(postdata));
		test.credential = await rest_connection_credential.rest_post(resource, postdata);

		return (test.credential && test.credential.credential ? test.credential.credential : null);
	}

	async fetchVerifiabledPresentationVerification(audience, idtoken, vptoken, options) {
		var params = options;

		const alg = (options.alg ? options.alg : 'ES256');

		let rest_url = options.rest_url;


		let test = {};

		let resource;
		let postdata;

		const agent = await this.getNaturalPersonAgent(alg);
		const kid = agent.kid;
		
		let keySet = await this._getKeySet(alg);

		// cross
		let rest_connection_verify_cross = this._createRestConnection(rest_url);

		rest_connection_verify_cross.addToHeader({key: 'conformance', value: params.conformance});
		
		// '/authentication_responses'
		resource = '';
		resource += '?conformance=' + params.conformance;
		resource += '&flow_type=cross-device';
		resource += '&scheme=openid';

		rest_connection_verify_cross.content_type = 'application/x-www-form-urlencoded';

		postdata = {};

		postdata = 'id_token=' + idtoken;
		postdata += '&vp_token=' + vptoken;


		test.verify_cross_device = await rest_connection_verify_cross.rest_post(resource, postdata);


		return test.verify_cross_device;
	}

	// verifiable presentations
	async createVerifiablePresentationJWT(aud, vcJwt, alg) {
		var session = this.session;

		const uuid = require('uuid');
		let uuidv4 = uuid.v4;
		let nonce = uuidv4();

		const vc = (await this._decodeJWT(vcJwt)).payload.vc;
		let keySet = await this._getKeySet(alg);

		const agent = await this.getNaturalPersonAgent(alg);
		const kid = agent.kid;

		var crossJwkPubKey = keySet.jwkKeyPair.publicKey;

		// header
		var header = {alg, typ: 'JWT'};

		header.kid = kid;

		header.alg = this._getJwkKeyAlg(crossJwkPubKey);
		header.jwk = {crv: crossJwkPubKey.crv, kty: crossJwkPubKey.kty, x: crossJwkPubKey.x, y: crossJwkPubKey.y};

		// body
		let body;

		// id_token
		let id_token;

		body = {};

		body.iat = this._getTimeStamp();
		body.aud = aud;

		body.exp = this._getTimeStamp() + 3600;
		body.sub = agent.did;
		body.iss = 'https://self-isued.me/v2'; //agent.did;
		body.nonce = nonce;

		body._vp_token = {
			presentation_submission: {
			  definition_id: "conformance_mock_vp_request",
			  id: "VA presentation PrimusMoney",
			  descriptor_map: [
				{
				  id: "conformance_mock_vp",
				  format: "jwt_vp",
				  path: "$"
				}
			  ]
			}
		};


		//id_token = await this.createDidJWT(header, body, alg);
		id_token = await this._createJWT(header, body, header.alg); // to keep body.iss = 'https://self-isued.me'
		
		// vp_token
		let vp_token;

		const vp = {};

		vp["@context"] = ["https://www.w3.org/2018/credentials/v1" ];
		vp.id = 'http://example.com/primusmoney';
		vp.type = ["VerifiablePresentation"];
		vp.holder = agent.did;
		vp.verifiableCredential = [vcJwt];
		
		body = {};

		body.iat = this._getTimeStamp();
		body.jti = 'http://example.com/primusmoney';
		body.nbf = this._getTimeStamp();
		body.aud = aud;

		body.exp = this._getTimeStamp();
		body.sub = agent.did;
		body.iss = agent.did;
		body.vp = vp;
		body.nonce = nonce;

		vp_token = await this.createDidJWT(header, body, alg);

		return {id_token, vp_token};
	}

	async verifyVerifiablePresentationJWT(audience, idtoken, vptoken, options) {
		var verification = {result: false, validations: {}};

		try {
			//const EbsiVerifiablePresentation= require('@cef-ebsi/verifiable-presentation');
			const EbsiVerifiablePresentation = await import('@cef-ebsi/verifiable-presentation');
			const { verifyPresentationJwt } = EbsiVerifiablePresentation;

			if (!options)
				options = {};

			if (!options.ebsiAuthority)
				options.ebsiAuthority = "api-conformance.ebsi.eu"; // for tests on conformance deployment

			// checks
			if (!vptoken)
				return verification; // avoids "Uncaught ValidationError: Unable to decode JWT VC" in this._decodeJWT

			const vp_obj = await this._decodeJWT(vptoken);

			verification.validations.vpFormat = {status: true};

			// check presentation
			let _audience = (audience ? audience : (vp_obj && vp_obj.payload ? vp_obj.payload.aud : null));
			let verifiedVp = await verifyPresentationJwt(vptoken, _audience, options);

			if (verifiedVp) {
				verification.result = true;

				verification.validations.presentation = {status: true};

				// check credential
				//let vc_jwt = (vp_obj && vp_obj.payload && vp_obj.payload.verifiableCredential ? vp_obj.payload.verifiableCredential[0]: null);
				verification.validations.credential = {status: true};
		
			}
			else {
				verification.result = false;

				verification.validations.presentation = {status: false, error: 'VP jwt validation failed',	details: 'unkown'};
				verification.validations.credential = {status: false};
			}

			
		}
		catch(e) {
			console.log('exception in verifyVerifiablePresentationJWT: ' + e);

			let error = (e ? (e.message ? e.message : e) : 'unknown');
			verification.validations.presentation = {status: false, error};
			verification.validations.credential = {status: false};

		}


		return verification;
	}

	// static
	static getObject(session, keyuuid) {
		return new Did(session, keyuuid);
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
_GlobalClass.registerModuleClass('crypto-did', 'Did', Did);