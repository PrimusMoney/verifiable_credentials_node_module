class JwCryptoKeys {

	constructor(session) {
		this.session = session;

		this.UtilsClass = null;
	}

	_getUtilsClass() {
		if (this.UtilsClass)
		return this.UtilsClass;

		let global = this.session.getGlobalObject();
		
		this.UtilsClass = global.getModuleClass('crypto-did', 'Utils');

		return this.UtilsClass;
	}

	// raw key
	async generateHexadecimalPrivateKey() {
		let session = this.session;
		let global = session.getGlobalObject();

		let ethereumjs = global.getGlobalStoredObject('ethereumjs');

		let cryptokeyPassword = session.guid(); // give more entropy than "123456"

		let key = ethereumjs.Wallet.generate(cryptokeyPassword);
		let _privKey = (key.privateKey ? key.privateKey : key._privKey);

		let _privHexKey =  '0x' + _privKey.toString('hex');

		/* var clientapicontrollers = this._getClientAPI();

		let _privHexKey = await clientapicontrollers.generatePrivateKey(this.session);*/

		return _privHexKey;
	}

	async exportHexadecimalPrivateKey(privateJwk) {
		const jose = require('jose');
		const Utils = this._getUtilsClass();

		let priv_utf8 = jose.base64url.decode(privateJwk.d);
		let priv_hex = Utils.encodehex(priv_utf8);

		return priv_hex;
	}

	async exportHexadecimalPublicKey(jwk) {
		const jose = require('jose');
		const Utils = this._getUtilsClass();

		let x_utf8 = jose.base64url.decode(jwk.x);
		let x_hex = Utils.encodehex(x_utf8);

		let y_utf8 = jose.base64url.decode(jwk.y);
		let y_hex = Utils.encodehex(y_utf8);

		return '0x' + x_hex.split('x')[1] + y_hex.split('x')[1];
	}

	// JWK keys
	_getJwkKeySigningAlg(jwk) {
		let signingAlg = 'ES256';

		if (!jwk)
			return signingAlg;

		switch(jwk.crv) {
			case 'P-256':
				signingAlg = "ES256";
				break;
			case 'secp256k1':
				signingAlg = 'ES256K';
				break;
			default:
				throw new Error(`Curve ${jwk.crv} not supported`);
		}

		return signingAlg;
	}

	async importPrivateKeyJwk(privateKeyHex, signingAlg){
		const Utils = this._getUtilsClass();
		const _Buffer = Utils._getBufferClass();

		const jose = require('jose');

		let publicKeyJWK;

 		switch (signingAlg) {
			case "ES256K": {
 				let EC = require('elliptic').ec;

				let ec = new EC('secp256k1'); 

				// import key
				let keyPair = ec.keyFromPrivate(privateKeyHex.split('x')[1]);
				
				let pubPoint = keyPair.getPublic();
				let xBN = pubPoint.getX();
				let yBN = pubPoint.getY();

				let xbuf = xBN.toArrayLike(_Buffer);
				let ybuf = yBN.toArrayLike(_Buffer);

				let x64url = jose.base64url.encode(xbuf);
				let y64url = jose.base64url.encode(ybuf);

				publicKeyJWK = {
					alg: "ES256K",
					kty: "EC",
					crv: "secp256k1",
					x: x64url,
					y: y64url
				};
			}
			break;

			case "ES256": {
 				let EC = require('elliptic').ec;

				//let ec = new EC('secp256k1'); 
				let ec = new EC('p256');

				// import key
				let keyPair = ec.keyFromPrivate(privateKeyHex.split('x')[1]);
				
				let pubPoint = keyPair.getPublic();
				let xBN = pubPoint.getX();
				let yBN = pubPoint.getY();

				let xbuf = xBN.toArrayLike(_Buffer);
				let ybuf = yBN.toArrayLike(_Buffer);

				let x64url = jose.base64url.encode(xbuf);
				let y64url = jose.base64url.encode(ybuf);

				publicKeyJWK = {
					alg: "ES256",
					kty: "EC",
					crv: "P-256",
					x: x64url,
					y: y64url
				};
			}
			break;

			case "EdDSA": {
				throw new Error(`Algorithm ${signingAlg} not supported`);
			}
			break;

			default:
			  throw new Error(`Algorithm ${signingAlg} not supported`);
		};

		// build JWK private key
		const d = _Buffer.from(privateKeyHex.split('x')[1], "hex")
		  .toString("base64")
		  .replace(/\+/g, "-")
		  .replace(/\//g, "_")
		  .replace(/=/g, "");

		let privateKeyJWK = { ...publicKeyJWK, d };

		privateKeyJWK.alg = signingAlg; // note alg for CryptoKey imports/exports
		privateKeyJWK.ext = true;

		return privateKeyJWK;
	}

	async getPublicKeyJwk(privateJwk) {
		const signingAlg = this. _getJwkKeySigningAlg(privateJwk);

		switch (signingAlg) {
		  case "ES256K":
		  case "ES256":
		  case "EdDSA": {
			const { d, ...publicJwk } = privateJwk;
			// TODO: maybe we should change key_ops to ['verify'];
			return publicJwk;
		  }
		  case "RS256": {
			const { d, p, q, dp, dq, qi, ...publicJwk } = privateJwk;
			return publicJwk;
		  }
		  default:
			throw new Error(`Algorithm ${signingAlg} not supported`);
		}
	}

	getJwkKeyAlg(publicJwk) {
		let alg = 'ES256';

		if (!publicJwk)
			return alg;

		switch(publicJwk.crv) {
			case 'P-256':
				alg = "ES256";
				break;
			case 'secp256k1':
				alg = 'ES256K';
				break;
			default:
				throw new Error(`Curve ${publicJwk.crv} not supported`);
		}

		return alg;
	}


	async importJwkKeyPair(privateKeyHex, signingAlg) {
		let privKeyJWK = await this.importPrivateKeyJwk(privateKeyHex, signingAlg);
		let pubKeyJWK = await this.getPublicKeyJwk(privKeyJWK);

		const jwkKeyPair = {privateKey: privKeyJWK, publicKey: pubKeyJWK};

		return jwkKeyPair;

	}

	async importJwkKeyPairFromCrypto(cryptoKeyPair) {

		let privCryptoKey = cryptoKeyPair.privateKey;

		let privKeyJWK = await window.crypto.subtle.exportKey('jwk', privCryptoKey);
		let pubKeyJWK = await this.getPublicKeyJwk(privKeyJWK);

		const jwkKeyPair = {privateKey: privKeyJWK, publicKey: pubKeyJWK};

		return jwkKeyPair;
	}

	
	async generateJwkKeyPair(signingAlg) {
		/* 		let privateKeyHex = await this.generateHexadecimalPrivateKey();
				let privKeyJWK = await this.importPrivateKeyJwk(privateKeyHex, signingAlg);
				let pubKeyJWK = await this.getPublicKeyJwk(privKeyJWK); */
		
				// TODO: should generate a private key, then compute jwkPrivateKey from hex key
		
		const jose = require('jose');

		const cryptoKeyPair = await this.generateCryptoKeyPair(signingAlg);

		let privKeyJWK = await jose.exportJWK(cryptoKeyPair.privateKey);
		let pubKeyJWK = await jose.exportJWK(cryptoKeyPair.prublicKey);

		const jwkKeyPair = {privateKey: privKeyJWK, publicKey: pubKeyJWK};

		return jwkKeyPair;
	}

	// CryptoKey keys
	async importCryptoKeyFromJwk(jwkKey) {
		const jose = require('jose');

		let signingAlg = jwkKey.alg;
		let importAlg;

		switch (signingAlg) {
			case "ES256K": {
				throw new Error('can not import secp256k1 curve');
			}
			break;
			case "ES256": {
				importAlg = "ES256";
			}
			break;
			default:
				throw new Error(`Algorithm ${signingAlg} not supported`);
	   };

	   let cryptoKey = await jose.importJWK(jwkKey, importAlg);

	   return cryptoKey;
	}

	async importCryptoKeyPairFromJwk(jwkKeyPair) {
		const jose = require('jose');

		let signingAlg = jwkKeyPair.privateKey.alg;
		let importAlg;

		switch (signingAlg) {
			case "ES256K": {
				throw new Error('can not import secp256k1 curve');
			}
			break;
			case "ES256": {
				importAlg = "ES256";
			}
			break;
			default:
				throw new Error(`Algorithm ${signingAlg} not supported`);
	   };

		let cryptoPrivKey = await jose.importJWK(jwkKeyPair.privateKey, importAlg);
		let cryptoPubKey = await jose.importJWK(jwkKeyPair.publicKey, importAlg);

		const cryptoKeyPair = {privateKey: cryptoPrivKey, publicKey: cryptoPubKey};

		return cryptoKeyPair;
	}

	async generateCryptoKeyPair(signingAlg) {
		const jose = require('jose');

		try {
			// trying to generate a hex private key then computing cryptoKeyPair
			let privateKeyHex = await this.generateHexadecimalPrivateKey();


/*
			//
			// computing a jwk key pair irst

			let importAlg;

 			switch (signingAlg) {
				case "ES256K": {

				}
				break;
				case "ES256": {
					importAlg = "ES256";
				}
				break;
				case "EdDSA": {
					throw new Error(`Algorithm ${signingAlg} not supported`);
				}
				break;
				default:
					throw new Error(`Algorithm ${signingAlg} not supported`);
			};

			let jwkKeyPair = await this.importJwkKeyPair(privateKeyHex, signingAlg);

			let cryptoPrivKey = await jose.importJWK(jwkKeyPair.privateKey, importAlg);
			let cryptoPubKey = await jose.importJWK(jwkKeyPair.publicKey, importAlg);
	
			const cryptoKeyPair = {privateKey: cryptoPrivKey, publicKey: cryptoPubKey}; */
	
			//
			// using window.crypto.subtle.importKey
			const Utils = this._getUtilsClass();
			const _Buffer = Utils._getBufferClass();

			let curveAlg;
			
			let format = 'raw';
			let keyData = _Buffer.from(privateKeyHex.split('x')[1], 'hex');
			let extractable = true;
			let keyUsages = ['sign'];//"verify" for public key import, "sign" for private key imports
	
			switch (signingAlg) {
				case "ES256K": {
					curveAlg = { name: 'ECDSA', namedCurve: 'P-256K' };
				}
				break;
				case "ES256": {
					curveAlg = { name: 'ECDSA', namedCurve: 'P-256' };
				}
				break;
				case "EdDSA": {
					throw new Error(`Algorithm ${signingAlg} not supported`);
				}
				default:
					throw new Error(`Algorithm ${signingAlg} not supported`);
			};
	
			// window.crypto.subtle.importKey does not support 'P-256K'
			let privCryptoKey = await window.crypto.subtle.importKey(format, keyData, curveAlg, extractable, keyUsages)
			.catch(err => {
				console.log(err);
			});



		}
		catch(e) {
			console.log('exception: ' + e);
		}


		// pair generated by jose
		const options = {extractable: true}
		const cryptoKeyPair = await jose.generateKeyPair((signingAlg ? signingAlg : "ES256"), options);

		return cryptoKeyPair;
	}

	// KeySet
	async _computeJwkKeyPair(session, privateKeyHex, alg) {
		var session = this.session;
		var global = session.getGlobalObject();

		let privKeyJWK = await this.importPrivateKeyJwk(privateKeyHex, alg);
		let pubKeyJWK = await this.getPublicKeyJwk(privKeyJWK);

		const jwkKeyPair = {privateKey: privKeyJWK, publicKey: pubKeyJWK};

		return jwkKeyPair;
	}

	async _computeKeySet(session, hexPrivateKey, alg) {
		let cryptoKeyPair;

		let keySet = {alg, hexPrivateKey};

		switch(alg) {
			case 'ES256K': {
				let jwkKeyPair = await this._computeJwkKeyPair(session, hexPrivateKey, alg);

				keySet.jwkKeyPair = jwkKeyPair;
			}
			break;

			case 'ES256': {
				let jwkKeyPair = await this._computeJwkKeyPair(session, hexPrivateKey, alg);

				keySet.jwkKeyPair = jwkKeyPair;

				const jose = require('jose');
		
				let jwkPrivateKey = jwkKeyPair.privateKey;
				let jwkPublicKey = jwkKeyPair.publicKey;
		
				let cryptoPrivKey = await jose.importJWK(jwkPrivateKey);
				let cryptoPubKey = await jose.importJWK(jwkPublicKey);
		
				cryptoKeyPair = {privateKey: cryptoPrivKey, publicKey: cryptoPubKey};
		
				keySet.cryptoKeyPair = cryptoKeyPair;
			}
			break;

			default:
				return Promise.reject('algorithm not suppported: ' + alg);
		}

		return keySet;
	}

	async getKeySet(keyuuid, alg) {
		var session = this.session;
		var global = session.getGlobalObject();
		var cryptokeyblockmodule = global.getModuleObject('cryptokey-block');
		var cryptokeyblockinterface = cryptokeyblockmodule.getCryptoKeyBlockInterface();

		const hexPrivateKey = await cryptokeyblockinterface.exportPrivateKey(session, keyuuid);

		return this._computeKeySet(session, hexPrivateKey, alg);
	}

	// static
	static getObject(session) {
		return new JwCryptoKeys(session);
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
_GlobalClass.registerModuleClass('crypto-did', 'JwCryptoKeys', JwCryptoKeys);