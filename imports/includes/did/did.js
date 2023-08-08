//import { createJWT, ES256KSigner, ES256Signer, hexToBytes } from 'did-jwt'; // create problems when in node.js

class Did {

	constructor(session, keyuuid, alg) {
		this.session = session;

		this.did = null;
		this.did_type = null;

		this.keyuuid = keyuuid;
		this.alg = alg;
		this.keySet = null;

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

	async createDidJWT(header, payload, alg, did_method, type) {
		let keySet = await this._getKeySet();

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

		let did = await this.getDid(alg, did_method, (type ? type : 'natural'));

		let options = {
			alg: _header.alg,
			issuer: did,
			signer,
			canonicalize: true,
		};

		let jwt = await createJWT(_body, options,_header);

		return jwt;

	}

	async setDid(did) {
		this.did = did;
	}

	async _computeDid(did_method, type) {
		let keySet = await this._getKeySet();

		this.did = await Did.buildDidFromKeySet(this.session, keySet, did_method, type);

		return this.did;
	}


	async getDid(alg, did_method, type) {
		if (alg) {
			console.log('OBSOLETE: should not use getDid with arguments, use Did.buildDidFromKeySet instead');
			let keySet = await this._getKeySet();

			if (!keySet)
				return Promise.reject('should have a keySet');

			// compute enriched alt_keySet
			if (!keySet.canExportHexPrivateKey())
			throw new Error('key set can not export private key');
		
			let hexPrivateKey = await keySet.exportHexPrivateKey();

			const cryptokeys = this._getCryptoKeysObject();
			let alt_keySet = await cryptokeys._computeKeySet(this.session, hexPrivateKey, alg)

			let alt_did = await Did.buildDidFromKeySet(this.session, alt_keySet, did_method, type);

			let alt_did_obj = Did.getObjectFromKeySet(this.session, alt_keySet, alt_did, type);

			return alt_did_obj.getDid();
		}

		if (this.did)
			return this.did;

		this.did = await this._computeDid(did_method, type);

		return this.did;
	}

	async computeKid() {
		let did = await this.getDid();

		let did_method = Did.getDidMethod(did);
		let did_type = this.did_type;

		let keySet = await this._getKeySet();

		const jose = require('jose');

		switch(did_method) {
			case 'ethr': {
				const kid = `${did}#owner1`;
		
				return kid;
			}

			case 'ebsi': {
				const publicKeyJwkAgent = keySet.jwkKeyPair.publicKey;

				const thumbprint = await jose.calculateJwkThumbprint(publicKeyJwkAgent, "sha256");
		
				const kid = `${did}#${thumbprint}`;
		
				return kid;
			}

			case 'key': {
				//const kid = `${did}#owner1`;
				let parts = did.split(':')
				const kid = did + '#' + parts[2];
		
				return kid;
			}

			default:
				return Promise.reject('did method not supported: ' + did_method);
		}
	}

	async getKid(alg, did_method, type) {
		if (alg)
		console.log('OBSOLETE: should not use getKid with arguments, use computeKid or Did.buildKidFromKeySet instead');

		return this.computeKid();
	}

	async _createJWT(header, body, alg) {
		var session = this.session;
		var global = session.getGlobalObject();

		const JWT = global.getModuleClass('crypto-did', 'JWT');
		const jwt = JWT.getObject(session, header, body)

		if (this.keyuuid)
		return jwt.createJWT(this.keyuuid, alg);
		else if (this.keySet)
		return jwt._createJWTFromKeySet(this.keySet);
		else
		return Promise.reject('can not create jwt, keySet is missing in did object')
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

	async _getKeySet() {
		if (this.keySet)
			return this.keySet;
		
		let keyuuid = this.keyuuid;
		let alg = this.alg;

		if (!keyuuid) {
			if (this.keySet)
			return this.keySet; // for temporary keys
			else
			return Promise.reject('missing key uuid');
		}

		const cryptokeys = this._getCryptoKeysObject();
		return cryptokeys.getKeySet(keyuuid, alg);
	}

	async getNaturalPersonAgent(alg, did_method) {
		var session = this.session;
		var global = session.getGlobalObject();

		let keySet = await this._getKeySet();
		let agent = {};

		switch (did_method) {
			case 'ebsi': {
				const EBSIServer = global.getModuleClass('crypto-did', 'EBSIServer');
				let ebsi_server = EBSIServer.getObject(session);
		
				let _ebsi_agent = await ebsi_server.getNaturalPersonAgent(keySet, alg);

				agent.did = _ebsi_agent.did;
				agent.kid = _ebsi_agent.kid;
			}
			break;

			default:
				return Promise.reject('did method not supported: ' + did_method);

		}

		return agent;
	}

	async getLegalPersonAgent(alg, did_method) {
		var session = this.session;
		var global = session.getGlobalObject();

		let keySet = await this._getKeySet();
		let agent = {};

		switch (did_method) {
			case 'ebsi': {
				agent.did = await this.getDid(alg, did_method, 'legal');
				agent.kid =  await this.getKid(alg, did_method, 'legal');
			}
			break;

			default:
				return Promise.reject('did method not supported: ' + did_method);

		}

		return agent;
	}

	async getPersonAgent(alg, did_method, type) {
		switch(type) {
			case 'natural':
				return this.getNaturalPersonAgent(alg,did_method);
			case 'legal':
				return this.getLegalPersonAgent(alg,did_method);
			default:
				return Promise.reject('unknown person type: ' + type);
		}

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


	// verifiable presentations
	async createVerifiablePresentationJWT(aud, vcJwt, alg, options) {
		var session = this.session;

		const uuid = require('uuid');
		let uuidv4 = uuid.v4;
		let nonce = uuidv4();
		let submission_id = uuidv4();

		const vc = (await this._decodeJWT(vcJwt)).payload.vc;
		let keySet = await this._getKeySet();

		const agent = await this.getPersonAgent(alg, 
												(options && options.did_method ? options.did_method : 'ebsi'),
												(options && options.type ? options.type : 'natural'));
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
			  id: submission_id,
			  descriptor_map: [
				{
				  id: "conformance_mock_vp",
				  format: "jwt_vp",
				  path: "$"
				}
			  ]
			}
		};


		//id_token = await this.createDidJWT(header, body, alg, (options.did_method ? options.did_method : 'ebsi'));
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

		body.exp = this._getTimeStamp() + 3600;
		body.sub = agent.did;
		body.iss = agent.did;
		body.vp = vp;
		body.nonce = nonce;

		vp_token = await this.createDidJWT(header, body, alg, (options.did_method ? options.did_method : 'ebsi'),
											(options && options.type ? options.type : 'natural'));

		return {id_token, vp_token};
	}
	
	// static
	static createBlankObject(session) {
		let didobj =  new Did(session, null, 'ES256');

		return didobj;
	}

	static getObject(session, keyuuid, alg, did, did_type) {
		if (!keyuuid)
		throw new Error('must provide keyuuid, use createBlankObject if necessary');

		if (!alg)		
		throw new Error('must provide alg');


		let didobj =  new Did(session, keyuuid, alg);

		if (did) {
			if (!did_type)
				return Promise.reject('must provide did_type');

			didobj.setDid(did);
			didobj.did_type = did_type;
		}

		return didobj;
	}

	static getObjectFromKeySet(session, keySet, did, type) {
		if (!keySet)
		throw new Error('must provide keySet');

		let didobj = new Did(session);

		didobj.keySet = keySet;

		if (did) {
			let did_method = Did.getDidMethod(did);

			if ((did_method == 'ebsi') && !type)
				return Promise.reject('ebsi dids must provide did_type');

			didobj.setDid(did);
			didobj.did_type = (type ? type : 'n.a.');
		}
		else {
			throw new Error('must provide did and type');
		}

		return didobj;
	}

	static async buildObjectFromKeyUUID(session, keyuuid, alg, method, type) {
		if (!keyuuid || !alg)
		throw new Error('must provide keyuuid and alg');

		// TODO: streamline the build operation with a buildDidFromKeyUUID
		let didobj = new Did(session, keyuuid, alg);

		let keySet = await didobj._getKeySet();

		didobj.keySet = keySet;

		let did = await Did.buildDidFromKeySet(session, keySet, method, type);

		didobj.setDid(did);
		didobj.did_type = (type ? type : 'n.a.');

		return didobj;
	}



	static async buildObjectFromKeySet(session, keySet, did, type) {
		if (!keySet)
		throw new Error('must provide keySet');

		let didobj = new Did(session);

		didobj.keySet = keySet;

		if (did) {
			let did_method = Did.getDidMethod(did);

			if ((did_method == 'ebsi') && !type)
				return Promise.reject('ebsi dids must provide did_type');

			didobj.setDid(did);
			didobj.did_type = (type ? type : 'n.a.');
		}
		else {
			didobj.did_type = 'natural';
			let _did = await Did.buildDidFromKeySet(session, keySet, 'key', type);
			didobj.setDid(_did);
		}

		return didobj;
	}

	static async buildDidFromKeySet(session, keySet, did_method, type) {
		var global = session.getGlobalObject();

		switch(did_method) {
			case 'ethr': {
				let aes_pub_keys = await keySet.getAesPublicKeys();
				let _ethr_did = 'did:ethr:' + aes_pub_keys.address;
		
				return _ethr_did;
			}

			case 'ebsi': {
				const EBSIServer = global.getModuleClass('crypto-did', 'EBSIServer');
				let ebsi_server = EBSIServer.getObject(session);
		
				let _ebsi_did = await ebsi_server.createDid(keySet, 'ebsi', type);		
				return _ebsi_did;
			}

			case 'key': {
				const EBSIServer = global.getModuleClass('crypto-did', 'EBSIServer');
				let ebsi_server = EBSIServer.getObject(session);
		
				let _key_did = await ebsi_server.createDid(keySet, 'key', type);		
				return _key_did;
			}

			default:
				return Promise.reject('did method not supported: ' + did_method);
		}

	}

	static getDidMethod(did) {
		var parts = did.split(':');

		return parts[1];
	}


	static async buildKidFromKeySet(session, keySet, did_method, type) {
		const jose = require('jose');

		const did = await Did.buildDidFromKeySet(session, keySet, did_method, type);

		let did_obj = await Did.getObjectFromKeySet(session, keySet, did, type);

		return did_obj.computeKid();
	}

	static async build_id_token(session, keySet, did, type, aud, nonce) {
		var global = session.getGlobalObject();
		const JWT = global.getModuleClass('crypto-did', 'JWT');

		let did_obj = await Did.getObjectFromKeySet(session, keySet, did, type);
		let kid = await did_obj.getKid();

		let header = {
			typ: 'JWT'
		};

		//header.alg = keySet.alg;
		header.alg = 'ES256';
		// 2023.05.26 EBSI only accepts id_token signed with ES256
		header.kid = kid;


		let payload = {};

		payload.iss = did;
		payload.sub = did;
		payload.aud = aud;
		payload.iat = did_obj._getTimeStamp();
		payload.exp = payload.iat + 3600;
		payload.nonce = nonce;

		const jwt = JWT.getObject(session, header, payload);

		return jwt._createJWTFromKeySet(keySet);
	}

	static async build_vp_token(session, iss_keySet, iss_did, type, aud, nonce, presentation_definition, client_id, redirect_uri) {
		var global = session.getGlobalObject();
		const JWT = global.getModuleClass('crypto-did', 'JWT');

		let did_obj = await Did.getObjectFromKeySet(session, iss_keySet, iss_did, type);
		let kid = await did_obj.getKid();

		let header = {
			typ: 'JWT'
		};

		//header.alg = iss_keySet.alg;
		header.alg = 'ES256';
		// 2023.05.26 EBSI only accepts vp_token signed with ES256
		header.kid = kid;


		let payload = {};

		payload.iss = iss_did;
		payload.sub = iss_did;
		payload.aud = aud;
		payload.iat = did_obj._getTimeStamp();
		payload.exp = payload.iat + 3600;
		payload.nonce = nonce;

		payload.response_type = 'vp_token';
		payload.response_mode = 'direct_post';
		payload.scope = 'openid';

		payload.presentation_definition = presentation_definition;

		payload.client_id = client_id;
		payload.redirect_uri = redirect_uri;

		const jwt = JWT.getObject(session, header, payload);

		return jwt._createJWTFromKeySet(iss_keySet);
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