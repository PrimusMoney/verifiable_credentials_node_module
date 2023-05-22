/**
 * 
 */
'use strict';

var SiopServerInterface = class {
	constructor(module) {
		this.module = module;
		this.global = module.global;
		
		this.siop_server_access_instance = null;
	}
	
	getSiopServerAccessInstance(session) {
		if (session.siop_server_access_instance)
			return session.siop_server_access_instance;
		
		console.log('instantiating SiopServerAccess');
		
		var global = this.global;
		var _globalscope = global.getExecutionGlobalScope();
		
		var SiopServerAccess = _globalscope.simplestore.SiopServerAccess;
		
		var result = []; 
		var inputparams = [];
		
		inputparams.push(this);
		inputparams.push(session);
		
		var ret = global.invokeHooks('getSiopServerAccessInstance', result, inputparams);
		
		if (ret && result[0]) {
			session.siop_server_access_instance = result[0];
		}
		else {
			session.siop_server_access_instance = new SiopServerAccess(session);
		}
		
		return session.siop_server_access_instance;
	}
	
	// api
	async getSiopServerInfo(session) {
		var siopaccess = this.getSiopServerAccessInstance(session);
		
		return siopaccess.siop_server_info();
	}

	async initializeSession(session, params) {
		var siopaccess = this.getSiopServerAccessInstance(session);
		
		return siopaccess.siop_initialize_session(params);
	}

	async impersonateSession(session, params) {
		var siopaccess = this.getSiopServerAccessInstance(session);
		
		return siopaccess.siop_impersonate_session(params);
	}
}

if ( typeof window !== 'undefined' && typeof window.GlobalClass !== 'undefined' && window.GlobalClass ) {
	let _GlobalClass = window.GlobalClass;
	_GlobalClass.registerModuleClass('siop', 'SiopServerInterface', SiopServerInterface);
}
else if (typeof window !== 'undefined') {
	let _GlobalClass = ( window && window.simplestore && window.simplestore.Global ? window.simplestore.Global : null);
	
	_GlobalClass.registerModuleClass('siop', 'SiopServerInterface', SiopServerInterface);
}
else if (typeof global !== 'undefined') {
	// we are in node js
	let _GlobalClass = ( global && global.simplestore && global.simplestore.Global ? global.simplestore.Global : null);
	
	_GlobalClass.registerModuleClass('siop', 'SiopServerInterface', SiopServerInterface);
}