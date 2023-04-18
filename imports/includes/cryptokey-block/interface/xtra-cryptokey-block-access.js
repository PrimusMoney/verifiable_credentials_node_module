class XtraCryptoKeyBlockAccess {
	constructor(session) {
		this.session = session;
	}
	
	async isReady() {
		return true;
	}
	
	//
	// API
	//

	async get_crypto_key(keyuuid) {
		var session = this.session;
		throw 'not implemented yet!'
	}
}


if ( typeof window !== 'undefined' && window ) // if we are in browser and not node js (e.g. truffle)
window.simplestore.XtraCryptoKeyBlockAccess = XtraCryptoKeyBlockAccess;
else if (typeof global !== 'undefined')
global.simplestore.XtraCryptoKeyBlockAccess = XtraCryptoKeyBlockAccess; // we are in node js
