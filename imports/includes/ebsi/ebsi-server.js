class EBSIServer {
	constructor(session, type) {
		this.session = session;

		switch(type) {
			case 'conformance':
				this.rest_url = 'https://api-conformance.ebsi.eu'
				break;

			case 'pilot':
				this.rest_url = 'https://api-pilot.ebsi.eu'
				break;
	
			case 'production':
				this.rest_url = 'https://api.ebsi.eu'
				break;

			default:
				this.rest_url = 'https://api-conformance.ebsi.eu'
				break;
		}
	}


	getRestConnection() {
		if (this.rest_connection)
			return this.rest_connection;

		var session = this.session;
		var global = session.getGlobalObject();
		
		const AsyncRestConnection = global.getModuleClass('crypto-did', 'AsyncRestConnection');

	    this.rest_connection = new AsyncRestConnection(session, this.rest_url);
		
		return this.rest_connection;
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

	// @cef libs
	_getUtilsClass() {
		if (this.UtilsClass)
		return this.UtilsClass;

		let global = this.session.getGlobalObject();
		
		this.UtilsClass = global.getModuleClass('crypto-did', 'Utils');

		return this.UtilsClass;
	}

	async createDid(keySet, did_method, type) {

		const jose = require('jose');
		const Utils = this._getUtilsClass();

		const publicKeyJwkAgent = keySet.jwkKeyPair.publicKey;

		switch(did_method) {
			case 'ebsi': {
				switch (type) {
					case 'legal': {
						const EbsiWalib = require('@cef-ebsi/wallet-lib');
						let { EbsiWallet } = EbsiWalib;

						// Create a random Legal Entity DID
						const random_did = EbsiWallet.createDid("LEGAL_ENTITY");

						// non random, derived from public key
						const thumbprint = await jose.calculateJwkThumbprint(publicKeyJwkAgent, "sha256");

						let subject_id = Utils.encodehex(jose.base64url.decode(thumbprint)).split('x')[1].slice(0, 32);
						const did = `did:ebsi:${Utils.encodebase58btc('01' + subject_id, 'hex')}`; // '01' for legal person
				
						return did;
					}

					case 'natural': {
						const thumbprint = await jose.calculateJwkThumbprint(publicKeyJwkAgent, "sha256");

						let subject_id = Utils.encodehex(jose.base64url.decode(thumbprint));
						const did = `did:ebsi:${Utils.encodebase58btc('02' + subject_id.split('x')[1], 'hex')}`; // '02' for natural person
				
						return did;
					}

					default:
					return Promise.reject('type is not supported: ' + type);
				}

			}

			case 'key': {
				const {util} = require('@cef-ebsi/key-did-resolver');

				const did = util.createDid(publicKeyJwkAgent);

				return did;
			}

			default:
				return Promise.reject('did method not supported: ' + did_method);
		}
	}

	async getNaturalPersonAgent(keySet, alg) {
		var session = this.session;
		var global = session.getGlobalObject();
		const Utils = global.getModuleClass('crypto-did', 'Utils');

		const EbsiSiop = require('@cef-ebsi/siop-auth');
		const EbsiWalib = require('@cef-ebsi/wallet-lib');
		const jose = require('jose');


		let { Agent } = EbsiSiop;
		let { EbsiWallet } = EbsiWalib;
		let { calculateJwkThumbprint, exportJWK, JWK } = jose;
		
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

	async _decodeJWT(jwt) {
		var session = this.session;
		var global = session.getGlobalObject();

		const JWT = global.getModuleClass('crypto-did', 'JWT');
		return JWT.decodeJWT(jwt);
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
	
	
	// rest api
	async schema_list() {
		var resource = "/trusted-schemas-registry/v2/schemas";

		var res = await this.rest_get(resource);

		return res;
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

_GlobalClass.registerModuleClass('crypto-did', 'EBSIServer', EBSIServer);