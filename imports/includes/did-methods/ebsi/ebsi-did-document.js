class EBSIDidDocument {
	constructor(session, ebsi_server_type, did_object) {
		this.global = session.getGlobalObject();
		this.session = session;

		this.ebsi_server_type = ebsi_server_type;
		this.ebsi_env = null; // potentially filled in factory

		this.did_object = did_object;
		this.type = did_object.did_type;

	}

	getDid() {
		return this.did;
	}

	getKid() {
		return this.kid;
	}

	// static
	static async getObjectFromDid(session, did, type = 'legal', ebsi_env) {

		var global = session.getGlobalObject();

		const Did = global.getModuleClass('crypto-did', 'Did');

		let did_object = Did.createBlankObject(session);
		did_object.did = did;

		let ebsi_server_type = 'production';

		if (ebsi_env) {
			if (typeof ebsi_env === 'string' || ebsi_env instanceof String)
			ebsi_server_type = ebsi_env;
			else
			ebsi_server_type = ebsi_env.ebsi_env_string;
		}
		
		let obj = new EBSIDidDocument(session, ebsi_server_type, did_object);
		obj.ebsi_env = ebsi_env;
		obj.type = type;

		return obj;
	}

	static async buildObjectFromDid(session, did, keySet, alg, type = 'legal', ebsi_env) {
		var global = session.getGlobalObject();

		if (!keySet)
			return Promise.reject('must provide a valid keySet');

		if (keySet.alg != alg)
			return Promise.reject('keySet.alg and alg must match');

		const Did = global.getModuleClass('crypto-did', 'Did');

		let did_object = Did.getObjectFromKeySet(session, keySet, did, type);

		let ebsi_server_type = 'production';

		if (ebsi_env) {
			if (typeof ebsi_env === 'string' || ebsi_env instanceof String)
			ebsi_server_type = ebsi_env;
			else
			ebsi_server_type = ebsi_env.ebsi_env_string;
		}

		let obj = new EBSIDidDocument(session, ebsi_server_type, did_object, type);
		obj.ebsi_env = ebsi_env;

		await obj.init(alg);

		return obj;
	}

	static async buildObjectFromKeySet(session, keySet, alg, type = 'legal', ebsi_env) {
		var global = session.getGlobalObject();

		if (!keySet)
			return Promise.reject('must provide a valid keySet');

		if (keySet.alg != alg)
			return Promise.reject('keySet.alg and alg must match');

		const Did = global.getModuleClass('crypto-did', 'Did');

		let did =  await Did.buildDidFromKeySet(session, keySet, 'ebsi', 'legal');
		
		let did_object = Did.getObjectFromKeySet(session, keySet, did, type);

		let ebsi_server_type = 'production';

		if (ebsi_env) {
			if (typeof ebsi_env === 'string' || ebsi_env instanceof String)
			ebsi_server_type = ebsi_env;
			else
			ebsi_server_type = ebsi_env.ebsi_env_string;
		}

		let obj = new EBSIDidDocument(session, ebsi_server_type, did_object, type);
		obj.ebsi_env = ebsi_env;

		await obj.init(alg);

		return obj;
	}
	
	static async buildKeyDid(jwk) {
		const Ebsi_key_did_resolver = require('@cef-ebsi/key-did-resolver');
		const ebsi_key_did_resolver = Ebsi_key_did_resolver.util;

		let key_did = ebsi_key_did_resolver.createDid(jwk);

		return key_did;
	}
	
	static async buildKeyKid(jwk) {
		const Ebsi_key_did_resolver = require('@cef-ebsi/key-did-resolver');
		const ebsi_key_did_resolver = Ebsi_key_did_resolver.util;
		const jose = require('jose');

		let key_did = ebsi_key_did_resolver.createDid(jwk);

		let thumbprint = await jose.calculateJwkThumbprint(jwk);

		let key_kid = key_did + '#' + thumbprint;

		return key_kid;
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

_GlobalClass.registerModuleClass('crypto-did', 'EBSIDidDocument', EBSIDidDocument);