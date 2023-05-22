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

	static async validateJWTSigning(session, jwt) {
		let global = session.getGlobalObject();

		let decodedJwt = await JWT.decodeJWT(jwt);

		let header = decodedJwt.header;
		let payload = decodedJwt.payload;
		let signature = decodedJwt.signature;

		decodedJwt.valid = false;

		switch(header.alg) {
			case 'ES256': {
				const jose = require('jose');

				const JwCryptoKeys = global.getModuleClass('crypto-did', 'JwCryptoKeys');
				const cryptokeys = JwCryptoKeys.getObject(session);
				let publicJwk = header.jwk;

				let publicCryptoKey = await cryptokeys.importCryptoKeyFromJwk(publicJwk);

    			let result = await jose.jwtVerify(jwt, publicCryptoKey).catch(err=> {});
				
				decodedJwt.valid = (result ? true : false);
			}
			break;
			case 'ES256K': {
				const jose = require('jose');

				const JwCryptoKeys = global.getModuleClass('crypto-did', 'JwCryptoKeys');
				const cryptokeys = JwCryptoKeys.getObject(session);
				let publicJwk = header.jwk;

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
			break;

			default:
				return Promise.reject(`Algorithm ${header.alg} not supported`);
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