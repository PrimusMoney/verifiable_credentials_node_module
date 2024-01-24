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