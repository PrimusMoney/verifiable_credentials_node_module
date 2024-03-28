class JWT {

	constructor(session, header, body) {
		this.session = session;

		this.header = header;
		this.body = body;
	}

	_getCryptoKeysObject() {
		var session = this.session;
		var global = session.getGlobalObject();
		var cryptodidmodule = global.getModuleObject('crypto-did');

		const CryptoKeys = global.getModuleClass('crypto-did', 'JwCryptoKeys');
		const cryptokeys = CryptoKeys.getObject(session);

		return cryptokeys;
	}

	async _getKeySet(keyuuid, alg) {
		const cryptokeys = this._getCryptoKeysObject();
		return cryptokeys.getKeySet(keyuuid, alg);
	}

	async _createJWTFromKeySet(keySet) {
		const publicJwk = keySet.jwkKeyPair.publicKey;

		let signingAlg = keySet.alg;

		let header = Object.assign({}, this.header);
		let body = Object.assign({}, this.body);

		header.alg = signingAlg;
		header.jwk = publicJwk;

		switch(signingAlg) {
			case 'ES256': {
				const jose = require('jose');

				let privateCrypto = keySet.cryptoKeyPair.privateKey;

				let jwt = await new jose.SignJWT(body)
				.setProtectedHeader(header)
				.sign(privateCrypto);
		
				return jwt;
			}
			case 'ES256K': {
				const jsontokens = require('jsontokens');

				if (!keySet.canExportHexPrivateKey())
					throw new Error('key set can not export private key');

				let priv_key = await keySet.exportHexPrivateKey();

				let jwt = new jsontokens.TokenSigner('ES256K', priv_key.split('x')[1]).sign(body, false, header);
		
				return jwt;
			}
			default:
				throw new Error(`Algorithm ${signingAlg} not supported`);

		}
	}

	async createJWT(keyuuid, alg) {
		const keySet = await this._getKeySet(keyuuid, alg);

		return this._createJWTFromKeySet(keySet);
	}


	// static
	static async decodeJWT(jwt) {
		/*const jose = require('jose');

		let data = await jose.decodeJwt(jwt)
		.catch( err => {
			console.log('error in _decodeDidJWT: ' + err);
		});

		return data; */

		const jsontokens = require('jsontokens');

		return jsontokens.decodeToken(jwt);
	}

	static async _verifyKidSignature(session, kid, jwt, decodedJwt) {
		let global = session.getGlobalObject();

		const jose = require('jose');

		
		let valid = false;

		let parts = kid.split(':');

		let did_method = parts[0] + ':' +  parts[1];
		
		switch(did_method) {
			case 'did:key': {
				let did_key = kid.substr(0, kid.indexOf('#'))
				let publicKeyJwk;
				let publicKeyCrypto;

				parts = jwt.split('.');


				if (kid.startsWith('did:key:z2dm')) {
					// EBSI version
					const Ebsi_key_did_resolver = require('@cef-ebsi/key-did-resolver');
					const did_resolver = require('did-resolver');
					const Resolver = did_resolver.Resolver;
		
					const ebsiResolver = Ebsi_key_did_resolver.getResolver();
		
					const didResolver = new Resolver(ebsiResolver);
		
					const doc = await didResolver.resolve(did_key);
					const didDocument = doc.didDocument;
			
					publicKeyJwk = (didDocument.verificationMethod ? didDocument.verificationMethod[0].publicKeyJwk : null);
					publicKeyCrypto = await jose.importJWK(publicKeyJwk, 'ES256');

					// verify with jose
					let result = await jose.jwtVerify(jwt, publicKeyCrypto);
					let verified = (result && result.payload ? true : false);
					
					
					valid = (verified ? true : false);
				}
				else {
					const KeyDIDResolver = await import('key-did-resolver');
					const base58_universal = await import('base58-universal');
					const ed25519_verification_key_2020 = await import('@digitalbazaar/ed25519-verification-key-2020');
					const Ed25519VerificationKey2020 = ed25519_verification_key_2020.Ed25519VerificationKey2020;
					const base64url = require('base64url')
	
					const did_resolver = require('did-resolver');
					const Resolver = did_resolver.Resolver;
					
					const keyDidResolver = KeyDIDResolver.getResolver();
			
					const didResolver = new Resolver(keyDidResolver);

					const doc = await didResolver.resolve(did_key);
					const didDocument = doc.didDocument;
			
					let publicKeyBase58	= (didDocument.verificationMethod ? didDocument.verificationMethod[0].publicKeyBase58 : null);
					let publicKeyUintArr = await base58_universal.decode(publicKeyBase58);
					publicKeyJwk = await jose.exportJWK(publicKeyUintArr);


					const publicKeyHex = Buffer.from(publicKeyUintArr).toString('hex');

					// elliptic
					const Elliptic = require('elliptic');
					const EC = Elliptic.ec
					const EdDSA = Elliptic.eddsa;

					let ec = new EdDSA('ed25519');

					let keyPair = ec.keyFromPublic(publicKeyHex);

					publicKeyJwk = {
						alg: "EdDSA",
						kty: "OKP",
						crv: "Ed25519"};

					//let keyPair = ec.keyFromSecret(key.handle)
					//jwk.d = base64url(key.handle)
					publicKeyJwk.x = base64url(keyPair.pubBytes())

					publicKeyCrypto = await jose.importJWK(publicKeyJwk, 'EdDSA');

					//
					// verify with jose
					let result = await jose.jwtVerify(jwt, publicKeyCrypto);
					let verified = (result && result.payload ? true : false);

					valid = (verified ? true : false);
				}

			}
			break;

			default:
				return Promise.reject('did method of kid is not supported: ' + did_method);
		}

		return valid;
	}

	static async validateJWTSigning(session, jwt) {
		let global = session.getGlobalObject();

		const JWT = global.getModuleClass('crypto-did', 'JWT');
		let decodedJwt = await JWT.decodeJWT(jwt);

		let header = decodedJwt.header;

		decodedJwt.valid = false;

		switch(header.alg) {
			case 'EdDSA': {
				const jose = require('jose');
	
				const JwCryptoKeys = global.getModuleClass('crypto-did', 'JwCryptoKeys');
				
				let kid = header.kid;
				decodedJwt.valid = await JWT._verifyKidSignature(session, kid, jwt, decodedJwt);

			}
			break;

			case 'ES256': {
				const jose = require('jose');

				const JwCryptoKeys = global.getModuleClass('crypto-did', 'JwCryptoKeys');
				const cryptokeys = JwCryptoKeys.getObject(session);
				let publicJwk = header.jwk;

				if (header.jwk) {
					publicJwk = header.jwk;
					publicJwk.alg = 'ES256';

					let publicCryptoKey = await cryptokeys.importCryptoKeyFromJwk(publicJwk);

					let result = await jose.jwtVerify(jwt, publicCryptoKey).catch(err=> {});
					
					decodedJwt.valid = (result ? true : false);
				}
				else {
					let kid = header.kid;
					decodedJwt.valid = await JWT._verifyKidSignature(session, kid, jwt, decodedJwt);
				}

			}
			break;
			case 'ES256K': {
				const jose = require('jose');

				const JwCryptoKeys = global.getModuleClass('crypto-did', 'JwCryptoKeys');
				const cryptokeys = JwCryptoKeys.getObject(session);
				let publicJwk = header.jwk;

				if (header.jwk) {
					publicJwk = header.jwk;
					publicJwk.alg = 'ES256K';

					let javascript_env = global.getJavascriptEnvironment();
		
					if (javascript_env != 'browser') {
						let publicCryptoKey = await jose.importJWK(publicJwk, 'ES256K');
	
						let result = await jose.jwtVerify(jwt, publicCryptoKey).catch(err=> {});
					
						decodedJwt.valid = (result ? true : false);
					}
					else {
						return Promise.reject('jose.importJWK does not support ES256K on the browser');
					}
				}
				else {
					let kid = header.kid;
					decodedJwt.valid = await JWT._verifyKidSignature(session, kid, jwt, decodedJwt);
				}

 
			}
			break;

			default: {
				let _decodedJwt = await JWT.validateJWTSigning(session, jwt);

				decodedJwt.valid = (_decodedJwt ? _decodedJwt.valid : false);
			}
		}

		return decodedJwt;
	}

	static getObject(session, header, body) {
		return new JWT(session, header, body);
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
_GlobalClass.registerModuleClass('crypto-did', 'JWT', JWT);