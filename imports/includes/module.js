'use strict';


var Module = class {
	
	constructor() {
		this.name = 'crypto-did';
		
		this.global = null; // put by global on registration
		this.app = null;
		
		this.controllers = null;

		this.isready = false;
		this.isloading = false;
		
	}
	
	init() {
		console.log('module init called for ' + this.name);

		var global = this.global;
		
		this.isready = true;
	}
	
	// compulsory  module functions
	loadModule(parentscriptloader, callback) {
		console.log('loadModule called for module ' + this.name);
		
		if (this.isloading)
			return;
			
		this.isloading = true;

		var self = this;
		var global = this.global;


		var modulescriptloader;

		// look if cryptodidloader already created (e.g. for loading in node.js)
		modulescriptloader = global.findScriptLoader('cryptodidloader');

		// if not, create on as child as parent script loader passed in argument
		if (!modulescriptloader)
		modulescriptloader = parentscriptloader.getChildLoader('cryptodidloader');

		var xtraroot = './includes';
		var moduleroot = xtraroot;

		// common
		modulescriptloader.push_script( moduleroot + '/common/async-rest-connection.js');
		
		// cryptokey-block module
		var cryptokeyblockloader = modulescriptloader.getChildLoader('cryptoblockkeyloader'); // create loader with correct root dir
		cryptokeyblockloader.setScriptRootDir(modulescriptloader.getScriptRootDir() + './includes');
		modulescriptloader.push_script( moduleroot + '/cryptokey-block/modules/cryptokey-block/module.js');

		// did
		modulescriptloader.push_script( moduleroot + '/did/cryptocard.js');
		modulescriptloader.push_script( moduleroot + '/did/did.js');

		// ebsi
		modulescriptloader.push_script( moduleroot + '/ebsi/ebsi-server.js');

		// jw
		modulescriptloader.push_script( moduleroot + '/jw/jw-cryptokeys.js');
		modulescriptloader.push_script( moduleroot + '/jw/jwt.js');

		// siop module
		var sioploader = modulescriptloader.getChildLoader('sioploader'); // create loader with correct root dir
		sioploader.setScriptRootDir(modulescriptloader.getScriptRootDir() + './includes');
		modulescriptloader.push_script( moduleroot + '/siop/modules/siop/module.js');

		// utils
		modulescriptloader.push_script( moduleroot + '/utils/utils.js');

		// vcconnect (should be imported as a @p2pmoney/vcconnect node module)
/* 		modulescriptloader.push_script( moduleroot + '/vc-connect-client/client-rest-connection/vc-rest-server.js');

		modulescriptloader.push_script( moduleroot + '/vc-connect-client/client-web-socket/client-web-socket.js');
		modulescriptloader.push_script( moduleroot + '/vc-connect-client/client-web-socket/web-socket-server.js');

		modulescriptloader.push_script( moduleroot + '/vc-connect-client/pair-connection/remote-pair-calls.js'); */

		// verifiable credentials server access
		var verifiablecredentialsserverloader = modulescriptloader.getChildLoader('verifiablecredentialsserverloader'); // create loader with correct root dir
		verifiablecredentialsserverloader.setScriptRootDir(modulescriptloader.getScriptRootDir() + './includes');

		modulescriptloader.push_script( moduleroot + '/vc-server/interface/verifiablecredentials-access.js');
		modulescriptloader.push_script( moduleroot + '/vc-server/interface/verifiablecredentials-socket.js');
		
		modulescriptloader.push_script( moduleroot + '/vc-server/modules/vc-server/module.js');
		
		modulescriptloader.push_script( moduleroot + '/vc-server/modules/vc-server/model/verifiablecredentials-server.js');


		// load
		modulescriptloader.load_scripts(function() { self.init(); if (callback) callback(null, self); });

		return modulescriptloader;	
	}
	
	isReady() {
		return this.isready;
	}

	hasLoadStarted() {
		return this.isloading;
	}

	// optional module functions
	registerHooks() {
		console.log('module registerHooks called for ' + this.name);
		
		var global = this.global;

	
		// signal module is ready
		var rootscriptloader = global.getRootScriptLoader();
		rootscriptloader.signalEvent('on_crypto_did_module_ready');
	}
	
	postRegisterModule() {
		console.log('postRegisterModule called for ' + this.name);
		if (!this.isloading) {
			var global = this.global;
			var self = this;
			var rootscriptloader = global.getRootScriptLoader();
			
			this.loadModule(rootscriptloader, function() {
				if (self.registerHooks)
				self.registerHooks();
			});
		}
	}

	//
	// hooks
	//


	
	_getClientAPI() {
		if (this.clientapicontrollers)
			return this.clientapicontrollers;
		
		var global = this.global;
		
		var mvcclientwalletmodule = global.getModuleObject('mvc-client-wallet');
		
		this.clientapicontrollers = mvcclientwalletmodule._getClientAPI();

		return  this.clientapicontrollers;
	}

	// API

	// TEST
	async runTestCrypto(session) {
		var global = this.global;
		var _apicontrollers = this._getClientAPI();

		const JwCryptoKeys = global.getModuleClass('crypto-did', 'JwCryptoKeys');
		const cryptokeys = JwCryptoKeys.getObject(session);

/* 		try {
			let r1CryptoKeyPair = await cryptokeys.generateCryptoKeyPair('ES256');
			let k1CryptoKeyPair = await cryptokeys.generateCryptoKeyPair('ES256K');

			let r1JwkKeyPair = await cryptokeys.importJwkKeyPairFromCrypto(r1CryptoKeyPair);
			let k1JwkKeyPair = await cryptokeys.importJwkKeyPairFromCrypto(k1CryptoKeyPair);

			console.log();
		}
		catch(e) {
			console.log('exception in runTest: ' + e);
		} */

		try {
			// key pairs
			let privateKeyHex = await cryptokeys.generateHexadecimalPrivateKey();

			let k1JwkKeyPair = await cryptokeys.importJwkKeyPair(privateKeyHex, 'ES256K');
			let r1JwkKeyPair = await cryptokeys.importJwkKeyPair(privateKeyHex, 'ES256');

			//let k1CryptoKeyPair = await cryptokeys.importCryptoKeyPairFromJwk(k1JwkKeyPair);
			let r1CryptoKeyPair = await cryptokeys.importCryptoKeyPairFromJwk(r1JwkKeyPair);

/*			let k1JwkKeyPair2 = await cryptokeys.importJwkKeyPairFromCrypto(k1CryptoKeyPair);
			let r1JwkKeyPair2 = await cryptokeys.importJwkKeyPairFromCrypto(r1CryptoKeyPair);;
			
			let k1PrivHexKey = await cryptokeys.exportHexadecimalPrivateKey(k1JwkKeyPair2.privateKey);
			let r1PrivHexKey = await cryptokeys.exportHexadecimalPrivateKey(r1JwkKeyPair2.privateKey);
*/

			// public key
			let k1PubHexKey = await cryptokeys.exportHexadecimalPublicKey(k1JwkKeyPair.publicKey);
			let r1PubHexKey = await cryptokeys.exportHexadecimalPublicKey(r1JwkKeyPair.publicKey);

			let k1publickeys = await _apicontrollers.getPublicKeys(session, privateKeyHex);

			return true;
		}
		catch(e) {
			console.log('exception in runTestCrypto: ' + e);
		}

		return false;
	}

	async runTestJWT(session, keyuuid) {
		var global = this.global;
		var _apicontrollers = this._getClientAPI();

		const JWT = global.getModuleClass('crypto-did', 'JWT');

		try {
			// JWT
			let header = {hash: 'xdsmskd'};
			let body = {id: 'test'};

			const jwt = JWT.getObject(session, header, body);

			//let k1token = await jwt.createJWT(keyuuid, 'ES256K');
			let r1token = await jwt.createJWT(keyuuid, 'ES256');

			const Did = global.getModuleClass('crypto-did', 'Did');
			const k1did = Did.getObject(session, keyuuid);
			const r1did = Did.getObject(session, keyuuid);
	
			//let k1didtoken = await k1did.createDidJWT(header, body, 'ES256K');
			let r1didtoken = await r1did.createDidJWT(header, body, 'ES256');
			
			let k1Agent = await k1did.getNaturalPersonAgent('ES256K').catch(err => {}); // problem CryptoKey with secp256k1
			let r1Agent = await r1did.getNaturalPersonAgent('ES256');

			return true;
		}
		catch(e) {
			console.log('exception in runTestCrypto: ' + e);
		}

		return false;
	}

	async runTestEncryption(session, wallet) {
		var global = this.global;
		var _apicontrollers = this._getClientAPI();

		try {
			// symetric encryption
			const PLAIN_TEXT = 'the brown fox jumps over the lay dog';

			let aes_cyphertext = await this.aesEncryptString(session, wallet, PLAIN_TEXT);
			let aes_plaintext = await this.aesDecryptString(session, wallet, aes_cyphertext);

			console.log('aes decrypted text is: ' + aes_plaintext);

			// asymetric encryption
			let _sender_private_key = await this.generatePrivateKey(session);
			let senderaccount = session.createBlankAccountObject();
			senderaccount.setPrivateKey(_sender_private_key);
			let sender_rsa_publickey = senderaccount.getRsaPublicKey();



			let _recipient_private_key = await this.exportPrivateKey(session, wallet);
			let recipientaccount = session.createBlankAccountObject();
			recipientaccount.setPrivateKey(_recipient_private_key);

			let recipient_publickeys = await this.getPublicKeysFromUUID(session, wallet, null, 'RSA');
			let recipient_rsa_publickey = recipient_publickeys.publickey;


			let rsa_cyphertext_in = await _apicontrollers.rsaEncryptString(senderaccount, recipientaccount, PLAIN_TEXT);
			let rsa_plaintext_in = await this.rsaDecryptString(session, wallet, sender_rsa_publickey, rsa_cyphertext_in);

			console.log('rsa decrypted incoming text is: ' + rsa_plaintext_in);

			let rsa_cyphertext_out = await this.rsaEncryptString(session, wallet, sender_rsa_publickey, PLAIN_TEXT);
			let rsa_plaintext_out = await _apicontrollers.rsaDecryptString(senderaccount, recipientaccount, rsa_cyphertext_out);

			console.log('rsa decrypted outgoing text is: ' + rsa_plaintext_out);


			// signing
			let signature = await this.signString(session, wallet, PLAIN_TEXT);
			let isValid = await this.validateStringSignature(session, wallet, PLAIN_TEXT, signature);

			console.log('signature validity is: ' + isValid);

			return true;
		}
		catch(e) {
			console.log('exception in runTestCrypto: ' + e);
		}

		return false;
	}
	// TEST


	// API

	//
	// Crypto functions
	//

	async generatePrivateKey(session) {
		var global = this.global;
		var cryptokeyblockmodule = global.getModuleObject('cryptokey-block');
		var cryptokeyblockinterface = cryptokeyblockmodule.getCryptoKeyBlockInterface();
		return cryptokeyblockinterface.generatePrivateKey(session);
	}

	async exportPrivateKey(session, wallet, keyuuid) {
		var global = this.global;
		var _apicontrollers = this._getClientAPI();

		var walletsession = wallet._getSession();
		var walletuser = walletsession.getSessionUserObject();

		if (!walletuser)
			return Promise.reject('wallet is not authentified');

		var cryptokeyblockmodule = global.getModuleObject('cryptokey-block');
		var cryptokeyblockinterface = cryptokeyblockmodule.getCryptoKeyBlockInterface();

		return cryptokeyblockinterface.exportPrivateKey(walletsession, keyuuid);
	}

	async getPublicKeysFromUUID(session, wallet, keyuuid, kty) {
		var global = this.global;
		var _apicontrollers = this._getClientAPI();

		var walletsession = wallet._getSession();
		var walletuser = walletsession.getSessionUserObject();

		if (!walletuser)
			return Promise.reject('wallet is not authentified');

		var cryptokeyblockmodule = global.getModuleObject('cryptokey-block');
		var cryptokeyblockinterface = cryptokeyblockmodule.getCryptoKeyBlockInterface();

		return cryptokeyblockinterface.getPublicKeys(walletsession, {keyuuid, curve: 'secp256k1', encryption: {kty}});
	}

	async getPublicKeysFromPrivateKey(session, privatekey, alg) {
		var _apicontrollers = this._getClientAPI();

		var signingAlg = (alg ? alg : 'ES256K');

		switch(signingAlg) {
			case "ES256K": {
				return _apicontrollers.getPublicKeys(session, privatekey);
			}
			break;
			case "ES256": {
				const JwCryptoKeys = global.getModuleClass('crypto-did', 'JwCryptoKeys');
				const cryptokeys = JwCryptoKeys.getObject(session);

				let r1JwkKeyPair = await cryptokeys.importJwkKeyPair(privatekey, 'ES256');

				let pubKeyHex = await cryptokeys.exportHexadecimalPublicKey(r1JwkKeyPair.privateKey);

				return {publickey: pubKeyHex};
			}
			break;
			default:
				throw new Error(`Algorithm ${alg} not supported`);			
		}

	}

	//
	// Wallet functions
	//
	async getCryptoKeyUUIDList(session, wallet) {
		var global = this.global;
		var _apicontrollers = this._getClientAPI();

		var walletsession = wallet._getSession();
		var walletuser = walletsession.getSessionUserObject();

		if (!walletuser)
			return Promise.reject('wallet is not authentified');

		var cryptokeyblockmodule = global.getModuleObject('cryptokey-block');
		var cryptokeyblockinterface = cryptokeyblockmodule.getCryptoKeyBlockInterface();
		
		return cryptokeyblockinterface.getCryptoKeyUUIDList(walletsession);
	}

	// symetric encryption
	async aesEncryptString(session, wallet, plaintext, keyuuid) {
		var global = this.global;
		var _apicontrollers = this._getClientAPI();

		var walletsession = wallet._getSession();
		var walletuser = walletsession.getSessionUserObject();

		if (!walletuser)
			return Promise.reject('wallet is not authentified');

		var cryptokeyblockmodule = global.getModuleObject('cryptokey-block');
		var cryptokeyblockinterface = cryptokeyblockmodule.getCryptoKeyBlockInterface();

		return cryptokeyblockinterface.encryptString(walletsession, plaintext, {keyuuid, curve: 'secp256k1'});
	}

	async aesDecryptString(session, wallet, cyphertext, keyuuid) {
		var global = this.global;
		var _apicontrollers = this._getClientAPI();

		var walletsession = wallet._getSession();
		var walletuser = walletsession.getSessionUserObject();

		if (!walletuser)
			return Promise.reject('wallet is not authentified');

		var cryptokeyblockmodule = global.getModuleObject('cryptokey-block');
		var cryptokeyblockinterface = cryptokeyblockmodule.getCryptoKeyBlockInterface();

		return cryptokeyblockinterface.decryptString(session, cyphertext, {keyuuid, curve: 'secp256k1'});
	}

	// asymetric encryption
	async rsaEncryptString(session, wallet, recipientrsapublickey, plaintext, keyuuid) {
		var global = this.global;
		var _apicontrollers = this._getClientAPI();

		var walletsession = wallet._getSession();
		var walletuser = walletsession.getSessionUserObject();

		if (!walletuser)
			return Promise.reject('wallet is not authentified');

		var cryptokeyblockmodule = global.getModuleObject('cryptokey-block');
		var cryptokeyblockinterface = cryptokeyblockmodule.getCryptoKeyBlockInterface();

		return cryptokeyblockinterface.encryptString(walletsession, plaintext, {keyuuid, curve: 'secp256k1', encryption: {kty: 'RSA'}, to: {publickey: recipientrsapublickey}});
	}
	
	async rsaDecryptString(session, wallet, senderrsapublickey, cyphertext, keyuuid) {
		var global = this.global;
		var _apicontrollers = this._getClientAPI();

		var walletsession = wallet._getSession();
		var walletuser = walletsession.getSessionUserObject();

		if (!walletuser)
			return Promise.reject('wallet is not authentified');

		var cryptokeyblockmodule = global.getModuleObject('cryptokey-block');
		var cryptokeyblockinterface = cryptokeyblockmodule.getCryptoKeyBlockInterface();

		return cryptokeyblockinterface.decryptString(session, cyphertext, {keyuuid, curve: 'secp256k1', encryption: {kty: 'RSA'}, from: {publickey: senderrsapublickey}});
	}

	// signing
	async signString(session, wallet, plaintext, keyuuid) {
		var global = this.global;
		var _apicontrollers = this._getClientAPI();

		var walletsession = wallet._getSession();
		var walletuser = walletsession.getSessionUserObject();

		if (!walletuser)
			return Promise.reject('wallet is not authentified');

		var cryptokeyblockmodule = global.getModuleObject('cryptokey-block');
		var cryptokeyblockinterface = cryptokeyblockmodule.getCryptoKeyBlockInterface();

		return cryptokeyblockinterface.signString(walletsession, plaintext, {keyuuid, signing: {alg: 'ES256K'}});
	}

	async validateStringSignature(session, wallet, text, signature, keyuuid) {
		var global = this.global;
		var _apicontrollers = this._getClientAPI();

		var walletsession = wallet._getSession();
		var walletuser = walletsession.getSessionUserObject();

		if (!walletuser)
			return Promise.reject('wallet is not authentified');

		var cryptokeyblockmodule = global.getModuleObject('cryptokey-block');
		var cryptokeyblockinterface = cryptokeyblockmodule.getCryptoKeyBlockInterface();

		return cryptokeyblockinterface.verifyString(walletsession, text, signature, {keyuuid, signing: {alg: 'ES256K'}});
	}

	//
	// Verifiable Credential functions
	//
	async fetchInitiationUrl(session, options) {
		var global = this.global;
		const Did = global.getModuleClass('crypto-did', 'Did');
		const did = Did.getObject(session, null);

		if (!options.conformance)
		options.conformance = session.getSessionUUID();

		return did.fetchInitiationUrl(options);
	}

	fetchVerifiableCredential(session, keyuuid, options) {
		var global = this.global;
		const Did = global.getModuleClass('crypto-did', 'Did');
		const did = Did.getObject(session, keyuuid);

		return did.fetchVerifiableCredential(options);
	}

	async fetchVerifiabledPresentationVerification(session, audience, idtoken, vptoken, options) {
		var global = this.global;
		const Did = global.getModuleClass('crypto-did', 'Did');
		const did = Did.getObject(session, null);

		return did.fetchVerifiabledPresentationVerification(audience, idtoken, vptoken, options);
	}

	createVerifiablePresentationJWT(session, audience, vcJwt, keyuuid, alg) {
		var global = this.global;
		const Did = global.getModuleClass('crypto-did', 'Did');
		const did = Did.getObject(session, keyuuid);

		return did.createVerifiablePresentationJWT(audience, vcJwt, alg)
	}


	verifyVerifiablePresentationJWT(session, audience, idtoken, vptoken, options) {
		var global = this.global;
		const Did = global.getModuleClass('crypto-did', 'Did');
		const did = Did.getObject(session, null);

		return did.verifyVerifiablePresentationJWT(audience, idtoken, vptoken, options);
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

_GlobalClass.getGlobalObject().registerModuleObject(new Module());

// dependencies
_GlobalClass.getGlobalObject().registerModuleDepency('crypto-did', 'common');
