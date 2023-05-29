/**
 * 
 */
 'use strict';

var KeySet = class {
	constructor(session) {
		this.session = session;

		// keySet corresponds only to 1 alg and 1 hexPrivateKey
		// use exportKeySet to transform
		this.keyuuid = null;
		this.hexPrivateKey = null;
		this.alg = null;
	} 

	canExportHexPrivateKey() {
		// TODO: go through cryptokeyblockaccessinstance
		if (this.hexPrivateKey)
		return true;
	}

	getAlg() {
		return this.alg;
	}

	getKeyUUID() {
		return this.keyuuid;
	}

	async exportKeySet(alg) {
		let keySet = new KeySet(this.session);

		keySet.hexPrivateKey = this.hexPrivateKey;
		keySet.alg = this.alg;

		return keySet;
	}

	async exportHexPrivateKey() {
		// TODO: go through cryptokeyblockaccessinstance
		return this.hexPrivateKey;
	}

	async getAesPublicKeys() {
		// TODO: go through cryptokeyblockaccessinstance
		var session = this.session;
		var global = session.getGlobalObject();

		let cryptokeyblockmodule = global.getModuleObject('cryptokey-block');
		let cryptokeyblockinterface = cryptokeyblockmodule.getCryptoKeyBlockInterface();
		let keyuuid = this.keyuuid;

		if (!keyuuid && this.hexPrivateKey) {
			keyuuid = session.guid();

			let cryptokey = session.createBlankCryptoKeyObject();

			cryptokey.setKeyUUID(keyuuid);
			cryptokey.setPrivateKey(this.hexPrivateKey);

			session.addCryptoKeyObject(cryptokey);

			let user = session.getSessionUserObject();
	
			if (user) user.addCryptoKeyObject(cryptokey);
		}

		let aes_pub_keys = await cryptokeyblockinterface.getPublicKeys(session, {keyuuid, curve: 'secp256k1'});

		return aes_pub_keys;
	}
}

var CryptoKeyBlockInterface = class {
	 constructor(module) {
		 this.module = module;
		 this.global = module.global;
		 
		 this.cryptokey_server_access_instance = null;
	}

	async createKeySet(session, hexPrivateKey, alg) {
		let keySet = new KeySet(session);

		keySet.hexPrivateKey = hexPrivateKey;
		keySet.alg = alg;
		
		return keySet;
	}
	
	async getKeySet(session, keyuuid) {
		let keySet = new KeySet(session);

		keySet.keyuuid = keyuuid;
		
		return keySet;
	}
	 
	getCryptoKeyBlockAccessInstance(session) {
		 if (session.cryptokey_server_access_instance)
			 return session.cryptokey_server_access_instance;
		 
		 console.log('instantiating CryptoKeyBlockAccess');
		 
		 var global = this.global;
		 var _globalscope = global.getExecutionGlobalScope();
		 
		 var CryptoKeyBlockAccess = _globalscope.simplestore.CryptoKeyBlockAccess;
 
		 var Config = _globalscope.simplestore.Config;
 
		 var cryptokey_provider = (Config && (Config.get)  && (Config.get('cryptokey_provider')) ? Config.get('cryptokey_provider') : null);
 
		 var result = []; 
		 var inputparams = [];
		 
		 inputparams.push(this);
		 inputparams.push(session);
		 
		 var ret = global.invokeHooks('getCryptoKeyBlockAccessInstance_hook', result, inputparams);
		 
		 if (ret && result[0]) {
			session.cryptokey_server_access_instance = result[0];
		 }
		 else {
			session.cryptokey_server_access_instance = new CryptoKeyBlockAccess(session, cryptokey_provider);
		 }
		 
		 return session.cryptokey_server_access_instance;
	}
	 
	// api
	async generatePrivateKey(session) {
		var cryptokeyblockaccessinstance = this.getCryptoKeyBlockAccessInstance(session);
		return cryptokeyblockaccessinstance.generate_private_key();
	}

	async importPrivateKey(session, privatekey) {
		var cryptokeyblockaccessinstance = this.getCryptoKeyBlockAccessInstance(session);
		return cryptokeyblockaccessinstance.import_private_key(privatekey);
	}

	async exportPrivateKey(session, keyuuid) {
		var cryptokeyblockaccessinstance = this.getCryptoKeyBlockAccessInstance(session);
		return cryptokeyblockaccessinstance.export_private_key(keyuuid);
	}

	getCryptoKeyUUIDList(session) {
		var cryptokeyblockaccessinstance = this.getCryptoKeyBlockAccessInstance(session);
		return cryptokeyblockaccessinstance.get_crypto_key_uuid_list();
	}


	async getPublicKeys(session, keySet) {
		var cryptokeyblockaccessinstance = this.getCryptoKeyBlockAccessInstance(session);
		return cryptokeyblockaccessinstance.get_public_keys(keySet);
	}

	 // encryption/decryption
	async encryptString(session, plaintext, keySet) {
		var cryptokeyblockaccessinstance = this.getCryptoKeyBlockAccessInstance(session);
		return cryptokeyblockaccessinstance.encrypt_string(plaintext, keySet);
	}

	async decryptString(session, cyphertext, keySet) {
		var cryptokeyblockaccessinstance = this.getCryptoKeyBlockAccessInstance(session);
		return cryptokeyblockaccessinstance.decrypt_string(cyphertext, keySet);
	}

	// sign/verify
	async signString(session, plaintext, keySet) {
		var cryptokeyblockaccessinstance = this.getCryptoKeyBlockAccessInstance(session);
		return cryptokeyblockaccessinstance.sign_string(plaintext, keySet);
	}

	async verifyString(session, text, signature, keySet) {
		var cryptokeyblockaccessinstance = this.getCryptoKeyBlockAccessInstance(session);
		return cryptokeyblockaccessinstance.verify_string(text, signature, keySet);
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
 
 _GlobalClass.registerModuleClass('cryptokey-block', 'CryptoKeyBlockInterface', CryptoKeyBlockInterface);