/**
 * 
 */
'use strict';

var VerifiableCredentialsServerInterface = class {
	constructor(module) {
		this.module = module;
		this.global = module.global;
		
		//this.verifiablecredentials_server_access_instance = null; // would be shared by all sessions
		//this.verifiablecredentials_server_socket_instance = null;
	}
	
	getVerifiableCredentialsServerAccessInstance(session) {
		if (session.verifiablecredentials_server_access_instance)
			return session.verifiablecredentials_server_access_instance;
		
		console.log('instantiating VerifiableCredentialsServerAccess');
		
		var global = this.global;
		var _globalscope = global.getExecutionGlobalScope();
		
		var VerifiableCredentialsServerAccess = _globalscope.simplestore.VerifiableCredentialsServerAccess;

		var result = []; 
		var inputparams = [];
		
		inputparams.push(this);
		inputparams.push(session);
		
		var ret = global.invokeHooks('getVerifiableCredentialsServerAccessInstance_hook', result, inputparams);
		
		if (ret && result[0]) {
			session.verifiablecredentials_server_access_instance = result[0];
		}
		else {
			session.verifiablecredentials_server_access_instance = new VerifiableCredentialsServerAccess(session);
		}

		
		return session.verifiablecredentials_server_access_instance;
		
	}

	getVerifiableCredentialsServerSocketInstance(session) {
		if (session.verifiablecredentials_server_socket_instance)
			return session.verifiablecredentials_server_socket_instance;
		
		console.log('instantiating getVerifiableCredentialsServerSocket');
		
		var global = session.global;
		var _globalscope = global.getExecutionGlobalScope();
		
		var VerifiableCredentialsServerSocket = _globalscope.simplestore.VerifiableCredentialsServerSocket;

		var result = []; 
		var inputparams = [];
		
		inputparams.push(this);
		inputparams.push(session);
		
		var ret = global.invokeHooks('getVerifiableCredentialsServerSocketInstance_hook', result, inputparams);
		
		if (ret && result[0]) {
			session.verifiablecredentials_server_socket_instance = result[0];
		}
		else {
			session.verifiablecredentials_server_socket_instance = new VerifiableCredentialsServerSocket(session);
		}

		
		return session.verifiablecredentials_server_socket_instance;
		
	}
	
	// api

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

_GlobalClass.registerModuleClass('verifiablecredentials-server', 'VerifiableCredentialsServerInterface', VerifiableCredentialsServerInterface);