class KeyMethodSubModule {
	constructor(crypto_did_module) {
		this.crypto_did_module = crypto_did_module;
		this.global = crypto_did_module.global;
	}

	async exportJwkKeyPair(session, keySet, alg) {
		var global = session.getGlobalObject();

		const JwCryptoKeys = global.getModuleClass('crypto-did', 'JwCryptoKeys');
		const jwcryptokeys = JwCryptoKeys.getObject(session);

		if (!keySet.canExportHexPrivateKey())
			return Promise.reject('key set can not export private key');

		let privateKeyHex = await keySet.exportHexPrivateKey();

		return jwcryptokeys.importJwkKeyPair(privateKeyHex, alg);
	}

	_buildKeyDid(jwk) {
		var global = this.global;
		const EBSIDidDocument = global.getModuleClass('crypto-did', 'EBSIDidDocument');

		return EBSIDidDocument.buildKeyDid(jwk)
	}

	_buildKeyKid(jwk) {
		var global = this.global;
		const EBSIDidDocument = global.getModuleClass('crypto-did', 'EBSIDidDocument');

		return EBSIDidDocument.buildKeyKid(jwk)
	}

	async getEbsiKeyDidPair(session, keySet) {
		let did_pair = {};

		let jwk_keyPair = await this.exportJwkKeyPair(session, keySet, 'ES256');

		let key_did = await this._buildKeyDid(jwk_keyPair.publicKey);
		let key_kid = await this._buildKeyKid(jwk_keyPair.publicKey); // not satisfying EBSI v3 conformance tests

		// TODO: modify Did.computeKid
		let parts = key_did.split(':')
		key_kid = key_did + '#' + parts[2];

		did_pair.did = key_did;
		did_pair.kid = key_kid;

		return did_pair;
	}

	async getDidPairFromKeySet(session, keySet, alg) {
		const did_method_key = await import('@digitalbazaar/did-method-key');
		const didKeyDriver = did_method_key.driver();

		let cryptoLd_key_pair; // instantiate a key pair
		let privateKeyHex = await keySet.exportHexPrivateKey();
		let aesPublicKey = await keySet.getAesPublicKeys();
		let publicKeyHex = aesPublicKey.publickey;

		const bs58 = require('bs58');

		let privateKeyBase58 = bs58.encode(Buffer.from(privateKeyHex.split('x')[1], 'hex'));
		let publicKeyBase58 = bs58.encode(Buffer.from(publicKeyHex.split('x')[1], 'hex'));

		// create a secp256k1 key pair
		const CryptoLD = require('crypto-ld');
		const Ed25519VerificationKey2020 = await import('@digitalbazaar/ed25519-verification-key-2020');
		const EcdsaMultikey = await import('@digitalbazaar/ecdsa-multikey');

		let did_pair = {};

		switch(alg) {
			case 'ES256': {
				/* didKeyDriver.use({
					multibaseMultikeyHeader: 'zDn',
					fromMultibase: EcdsaMultikey.from
				});

				let secp256r1_key_pair = await EcdsaMultikey.generate({curve: 'P-256'});
				//let secp256r1_key_pair = await EcdsaMultikey.from({privateKeyBase58, publicKeyBase58});
				cryptoLd_key_pair = secp256r1_key_pair; */

				return this.getEbsiKeyDidPair(session, keySet);
			}
			break;

			case 'ES256K': {
				//let secp256k1_key_pair = await EcdsaMultikey.generate({curve: 'secp256k1'});
				let secp256k1_key_pair = await EcdsaMultikey.from({privateKeyBase58, publicKeyBase58});
				cryptoLd_key_pair = secp256k1_key_pair;
			}
			break;

			case 'Ed25519': {
				// create a test Ed25519 key pair
				const Ed25519KeyPair = CryptoLD.Ed25519KeyPair;

				let ed25519_key_pair = await Ed25519KeyPair.generate();
		
				cryptoLd_key_pair = ed25519_key_pair;
			}

			default:
				return Promise.reject('unsupported alg: ' + alg);
		}

		//const didId = await didKeyDriver.computeKeyId({key: cryptoLd_key_pair});
		const didD = await didKeyDriver.fromKeyPair({verificationKeyPair:  cryptoLd_key_pair});
			
		let key_did = didD;

		did_pair.did = key_did;

		// TODO: compute kid
		
		return did_pair;
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

_GlobalClass.registerModuleClass('crypto-did', 'KeyMethodSubModule', KeyMethodSubModule);