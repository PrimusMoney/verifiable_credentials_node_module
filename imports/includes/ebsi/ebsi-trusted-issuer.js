class EBSITrustedIssuer {
	constructor(session, ebsi_server_type) {
		this.global = session.getGlobalObject();
		this.session = session;

		this.ebsi_server_type = ebsi_server_type;

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

_GlobalClass.registerModuleClass('crypto-did', 'EBSITrustedIssuer', EBSITrustedIssuer);