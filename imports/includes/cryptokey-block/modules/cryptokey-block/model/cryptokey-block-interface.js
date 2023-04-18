/**
 * 
 */
 'use strict';

 var CryptoKeyBlockInterface = class {
	 constructor(module) {
		 this.module = module;
		 this.global = module.global;
		 
		 this.cryptokey_server_access_instance = null;
	 }
	 
	 getCryptoKeyBlockAccessInstance(session) {
		 if (this.cryptokey_server_access_instance)
			 return this.cryptokey_server_access_instance;
		 
		 console.log('instantiating CryptoKeyBlockAccess');
		 
		 var global = this.global;
		 var _globalscope = global.getExecutionGlobalScope();
		 
		 var CryptoKeyBlockAccess = _globalscope.simplestore.CryptoKeyBlockAccess;
 
		 var Config = _globalscope.simplestore.Config;
 
		 var cryptokey_provider = (Config && (Config.get)  && (Config.get('cryptokey_provider')) ? Config.get('cryptokey_provider') : null);
 
		 var result = []; 
		 var inputparams = [];
		 
		 inputparams.push(this);
		 
		 var ret = global.invokeHooks('getCryptoKeyBlockAccessInstance_hook', result, inputparams);
		 
		 if (ret && result[0]) {
			 this.cryptokey_server_access_instance = result[0];
		 }
		 else {
			 this.cryptokey_server_access_instance = new CryptoKeyBlockAccess(session, cryptokey_provider);
		 }
 
		 
		 return this.cryptokey_server_access_instance;
		 
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