class CryptoKeyBlockAccess {
	constructor(session) {
		this.session = session;
	}
	
	async isReady() {
		return true;
	}

	_getEncryptionAlg(keySet) {
		if (keySet.encryption && keySet.encryption.alg)
			return keySet.encryption.al;

		// encryption familly
		let _encr_kty = (keySet.encryption && keySet.encryption.kty ? keySet.encryption.kty : null);

		switch(_encr_kty) {
			case 'RSA':
				return 'ECIES';

			case 'EC': {
				switch(keySet.curve) {
					case 'secp256k1':
						return 'EC-P256K';
		
					case 'secp256r1':
						return 'EC-P256';
		
					default:
						return Promise.reject('only secp256k1 and secp256r1 curves are supported');
				}				
			}

			default: {
				// no familly, or unknown
				switch(keySet.curve) {
					case 'secp256k1':
						return 'EC-P256K';
		
					case 'secp256r1':
						return 'EC-P256';
		
						default:
						return Promise.reject('you need to at least define a supported curve');
				}

			}
		}

	}

	_getSigningAlg(keySet) {
		let _sign_alg = (keySet.signing && keySet.signing.alg ? keySet.signing.alg : null);

		switch(_sign_alg) {
			case 'ES256K':
				return 'ES256K';

			case 'ES256':
				return 'ES256';

			default: {
				if (_sign_alg)
					return _sign_alg;
				else {
					switch(keySet.curve) {
						case 'secp256k1':
							return 'ES256K';
			
						default:
							return Promise.reject('you need to at least define a supported curve');
					}					
				}
			}
		}
	}


	
	//
	// API
	//
	async get_crypto_key_uuid_list() {
		var session = this.session;
		var user = session.getSessionUserObject();

		if (!user)
			return Promise.reject('wallet is not authentified');
		
		var cryptokeys = user.getCryptoKeyObjects();

		var array = [];

		for (var i = 0; i < cryptokeys.length; i++) {
			let _crypto_keyuuid = cryptokeys[i].getKeyUUID();
			array.push(_crypto_keyuuid);
		}

		return array;
	}


	async get_crypto_key(keyuuid) {
		var session = this.session;
		var user = session.getSessionUserObject();

		if (!user)
			return Promise.reject('wallet is not authentified');
		
		var cryptokeys = user.getCryptoKeyObjects();

		if (!keyuuid)
			return cryptokeys[0];

		for (var i = 0; i < cryptokeys.length; i++) {
			let _crypto_keyuuid = cryptokeys[i].getKeyUUID();
			if (_crypto_keyuuid === keyuuid)
				return cryptokeys[i];
		}
	}

	async generate_private_key() {
		var session = this.session;
		var global = session.getGlobalObject();
		
		var ethereumjs = ethereumjs = global.getGlobalStoredObject('ethereumjs');

		var cryptokeyPassword = session.guid(); // give more entropy than "123456"(?)

		var key = ethereumjs.Wallet.generate(cryptokeyPassword);
		var _privKey = (key.privateKey ? key.privateKey : key._privKey);

		var _privHexKey =  '0x' + _privKey.toString('hex');

		return _privHexKey;
	}


	async import_private_key(privatekey) {
		var session = this.session;
		var global = session.getGlobalObject();
		
		// create account from private key
		var commonmodule = global.getModuleObject('common');
		
		if (!session.isValidPrivateKey(privatekey))
			return Promise.reject('ERR_INVALID_PRIVATE_KEY');
		
		var sessionuser = session.getSessionUserObject();
		var cryptokey = commonmodule.createBlankCryptoKeyObject(session);
		
		cryptokey.setPrivateKey(privatekey);
		cryptokey.setDescription(cryptokey.getAddress());
		cryptokey.setOrigin({storage: 'cryptokey-block'});
		
		if (sessionuser) {
			cryptokey.setOwner(sessionuser);
		}
		
		session.addCryptoKeyObject(cryptokey);

		// save crypto key
		var authkeymodule = global.getModuleObject('authkey');

		if (authkeymodule && (session.activate_authkey_server_access !== false)) {
			// TODO: for authkey version > 0.30.16 use 
			// let sessioncontext = await authkeymodule.getSessionContext(session);
			// if (authkeymodule && (sessioncontext.remote !== false))
			let authkeyserveraccess = authkeymodule.AuthKeyServerAccess(session);
		
			return new Promise((resolve, reject) => { 
				authkeyserveraccess.key_user_add(sessionuser, cryptokey, (err, res) => {
					if (err) reject(err); else resolve(res);
				});
			});
		}
		else {
			// TODO: store cryptokey locally
			// either as a new local vault associated to the user
			// or as a value saved in the local vault (easier)
			return Promise.reject('saving cryptokey locally, not implemented yet!');
		}

	}

	async export_private_key(keyuuid) {
		let cryptokey = await this.get_crypto_key(keyuuid);
		return cryptokey.getPrivateKey()
	}


	async get_public_keys(keySet) {
		var keyuuid = keySet.keyuuid;
		var alg = this._getEncryptionAlg(keySet);

		switch(alg) {
			case 'EC-P256K': {
				let cryptokey = await this.get_crypto_key(keyuuid);

				if (!cryptokey)
					return Promise.reject('no crypto key found for uuid ' + keyuuid);

				let public_keys = {alg};

				if (keySet.curve) public_keys.crv = keySet.curve;
				
				public_keys.publickey = cryptokey.getAesPublicKey();
				public_keys.address = cryptokey.getAddress();

				return public_keys;
			}

			case 'EC-P256': {
				return Promise.reject('EC-P256 not implemented yet!');
			}

			case 'ECIES': {
				let cryptokey = await this.get_crypto_key(keyuuid);

				if (!cryptokey)
					return Promise.reject('no crypto key found for uuid ' + keyuuid);

					let public_keys = {alg};

					if (keySet.curve) public_keys.crv = keySet.curve;
					
					public_keys.publickey = cryptokey.getRsaPublicKey();
	
					return public_keys;
			}

			default:
				return Promise.reject('does not support: ' + alg);
		}
	}

	async encrypt_string(plaintext, keySet) {
		var keyuuid = keySet.keyuuid;
		var alg = this._getEncryptionAlg(keySet);

		switch(alg) {
			case 'EC-P256K': {
				let cryptokey = await this.get_crypto_key(keyuuid);

				if (!cryptokey)
					return Promise.reject('no crypto key found for uuid ' + keyuuid);

				return cryptokey.aesEncryptString(plaintext);
			}

			case 'EC-P256': {
				return Promise.reject('EC-P256 not implemented yet!');
			}

			case 'ECIES': {
				let cryptokey = await this.get_crypto_key(keyuuid);

				if (!cryptokey)
					return Promise.reject('no crypto key found for uuid ' + keyuuid);

				var recipientrsapublickey = (keySet && keySet.to && keySet.to.publickey ? keySet.to.publickey : null );
				
				if (!recipientrsapublickey)
					return Promise.reject('missing recipient public key');

				let	recipientaccount = this.session.createBlankAccountObject();

				recipientaccount.setRsaPublicKey(recipientrsapublickey);
				
				return cryptokey.rsaEncryptString(plaintext, recipientaccount);
			}

			default:
				return Promise.reject('does not support: ' + alg);
		}
	}

	async decrypt_string(cyphertext, keySet) {
		var keyuuid = keySet.keyuuid;
		var alg = this._getEncryptionAlg(keySet);

		switch(alg) {
			case 'EC-P256K': {
				let cryptokey = await this.get_crypto_key(keyuuid);

				if (!cryptokey)
					return Promise.reject('no crypto key found for uuid ' + keyuuid);

				return cryptokey.aesDecryptString(cyphertext);
			}

			case 'EC-P256': {
				return Promise.reject('EC-P256 not implemented yet!');
			}

			case 'ECIES': {
				let cryptokey = await this.get_crypto_key(keyuuid);

				if (!cryptokey)
					return Promise.reject('no crypto key found for uuid ' + keyuuid);

				var senderrsapublickey = (keySet && keySet.from && keySet.from.publickey ? keySet.from.publickey : null );
				
				if (!senderrsapublickey)
					return Promise.reject('missing sender public key');
				
				let	senderaccount = this.session.createBlankAccountObject();

				senderaccount.setRsaPublicKey(senderrsapublickey);
				
				return cryptokey.rsaDecryptString(cyphertext, senderaccount);
			}
			
			default:
				return Promise.reject('does not support: ' + alg);
		}
	}

	// sign/verify
	async sign_string(plaintext, keySet) {
		var keyuuid = keySet.keyuuid;
		var alg = this._getSigningAlg(keySet);

		switch(alg) {
			case 'ES256K': {
				let cryptokey = await this.get_crypto_key(keyuuid);

				if (!cryptokey)
					return Promise.reject('no crypto key found for uuid ' + keyuuid);
		
				return cryptokey.signString(plaintext);
			}

			case 'ES256': {
				return Promise.reject('not implemented yet!');
			}

			default:
				return Promise.reject('does not support signing alg ' + alg);
		}
	}

	async verify_string(text, signature, keySet) {
		var keyuuid = keySet.keyuuid;
		var alg = this._getSigningAlg(keySet);

		switch(alg) {
			case 'ES256K': {
				let cryptokey = await this.get_crypto_key(keyuuid);

				if (!cryptokey)
					return Promise.reject('no crypto key found for uuid ' + keyuuid);
		
				return cryptokey.validateStringSignature(text, signature);
			}

			case 'ES256': {
				return Promise.reject('not implemented yet!');
			}

			default:
				return Promise.reject('does not support signing alg ' + alg);
		}
	}
}


if ( typeof window !== 'undefined' && window ) // if we are in browser and not node js (e.g. truffle)
window.simplestore.CryptoKeyBlockAccess = CryptoKeyBlockAccess;
else if (typeof global !== 'undefined')
global.simplestore.CryptoKeyBlockAccess = CryptoKeyBlockAccess; // we are in node js
