'use strict';

var Module = class {
	
	constructor() {
		this.name = 'siop';
		this.current_version = "0.30.18.2023.03.13";
		
		this.global = null; // put by global on registration
		this.isready = false;
		this.isloading = false;
		
		this.activated = true;
		
		//this.siop_server_access_instance = null;
		this.siop_interface = null;
		
		this.controllers = null;
	}
	
	activation(choice) {
		if (choice === false) {
			this.activated = false;
		}
		else if (this.activated === false) {
			this.activated = true;
		}
	}
	
	isActivated() {
		return this.activated;
	}
	
	init() {
		console.log('module init called for ' + this.name);
		
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

		// siop module script loader
		var modulescriptloader;
		
		// look if sioploader already created (e.g. for loading in node.js)
		modulescriptloader = global.findScriptLoader('sioploader');

		// if not, create on as child as parent script loader passed in argument
		if (!modulescriptloader)
		modulescriptloader = global.getScriptLoader('sioploader', parentscriptloader);
		
		var xtraroot = './includes';
		
		var interfaceroot = xtraroot + '/interface';

		modulescriptloader.push_script( interfaceroot + '/siop-access.js');

		var moduleroot = xtraroot + '/modules/siop';

		//modulescriptloader.push_script( moduleroot + '/control/controllers.js');
		
		modulescriptloader.push_script( moduleroot + '/model/siop.js');

		
		modulescriptloader.load_scripts(function() { self.init(); if (callback) callback(null, self); });
		
		return modulescriptloader;
	}
	
	isReady() {
		return this.isready;
	}

	hasLoadStarted() {
		return this.isloading;
	}

	// optional  module functions
	registerHooks() {
		console.log('module registerHooks called for ' + this.name);
		
		var global = this.global;
		
		global.registerHook('getVersionInfo_hook', this.name, this.getVersionInfo_hook);

		global.registerHook('setSessionNetworkConfig_asynchook', this.name, this.setSessionNetworkConfig_asynchook);

		global.registerHook('getAuthKeyServerAccessInstance_hook', this.name, this.getAuthKeyServerAccessInstance_hook);
		
		// signal module is ready
		var rootscriptloader = global.getRootScriptLoader();
		rootscriptloader.signalEvent('on_siop_module_ready');
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
	getVersionInfo_hook(result, params) {
		console.log('getVersionInfo_hook called for ' + this.name);
		
		var global = this.global;
		var _globalscope = global.getExecutionGlobalScope();
		var Constants = _globalscope.simplestore.Constants;
		var siop_versioninfo = Constants.get('siop_version');
		
		var versioninfos = params[0];
		
		var versioninfo = {};
		
		versioninfo.label = global.t('siop');

		if (siop_versioninfo && siop_versioninfo.value)
			versioninfo.value = siop_versioninfo.value; // overloaded
		else if (this.current_version)
			versioninfo.value = this.current_version; // hard-coded value
		else
			versioninfo.value = global.t('unknown');
		
		versioninfos.push(versioninfo);

		
		result.push({module: this.name, handled: true});
		
		return true;
	}

	async setSessionNetworkConfig_asynchook(result, params) {
		console.log('setSessionNetworkConfig_asynchook called for ' + this.name);

		// NOTE: siop module is executing on top of client_wallet 
		// (contrary to oauth2 that can be executed without client_wallet )
		
		var global = this.global;
		
		var session = params[0];
		var networkconfig = params[1];

		if (networkconfig && networkconfig.authserver && (networkconfig.authserver.mode === 'siop')) {
			session.activate_oauth2_server_access = false;
			session.activate_siop_server_access = true;

			// remember our auth config
			if (!session.getSessionVariable('siop_authserver')) {
				session.setSessionVariable('siop_authserver', networkconfig.authserver);
				session.setSessionVariable('siop_keyserver', networkconfig.keyserver);
	
				// reset authkey_server_access_instance (even if it is good because of clientmodules.setSessionNetworkConfig)
				// to get a getAuthKeyServerAccessInstance_hook call
				session.authkey_server_access_instance = null;
			}
		}
		else {
			session.activate_siop_server_access = false;
		}

		result.push({module: this.name, handled: true});
		
		return;
	}

		
	// authkey hook
	getAuthKeyServerAccessInstance_hook(result, params) {
		console.log('getAuthKeyServerAccessInstance_hook called for ' + this.name);
		
		if (this.activated === false)
			return false;

		var global = this.global;
		
		var authkeymodule = params[0];
		var session = params[1];
		
		// look if session deactivates siop
		if (session.activate_siop_server_access === false)
			return false;
		
		var authkey_server_access_instance = result[0];
		
		var _globalscope = global.getExecutionGlobalScope();
		var Config = _globalscope.simplestore.Config;

		
		// we look at our siop settings for auth and key
		var authserver = session.getSessionVariable('siop_authserver');
		var keyserver = session.getSessionVariable('siop_keyserver');

		var rest_auth_connection;
		var rest_key_connection;

		if (authserver && keyserver) {
			let rest_auth_url = authserver.rest_server_url;
			let rest_auth_api_path = authserver.rest_server_api_path;
			
			let rest_key_url = keyserver.rest_server_url;
			let rest_key_api_path = keyserver.rest_server_api_path;

			rest_auth_connection = session.createRestConnection(rest_auth_url, rest_auth_api_path);
			rest_key_connection = session.createRestConnection(rest_key_url, rest_key_api_path);

		}
		else {
			// like oauth2 when it is not executed with clientmodules
			let rest_server_url = session.getXtraConfigValue('rest_server_url'); // default is rest server
			let rest_server_api_path = session.getXtraConfigValue('rest_server_api_path');
			
			if (!rest_server_url) {
				// we are not in ethereum_webapp overload mode (simple copy)
				if (Config && (Config.get)  && (Config.get('siop_webapp_url')))
					rest_server_url = Config.get('siop_webapp_url');
			}
	
			if (!rest_server_api_path) {
				if (Config && (Config.get)  && (Config.get('siop_webapp_api_path'))) {
					rest_server_api_path = Config.get('siop_webapp_api_path');
					
					// strip siop
					rest_server_api_path = rest_server_api_path.replace('/siop', '');
				}
			}
			
			let rest_auth_url;
			let rest_auth_api_path;
			
			let rest_key_url;
			let rest_key_api_path;
	
		   
			//
			// rest_auth_connection
			//
			if (Config && (Config.get)  && (Config.get('siop_auth_server_url'))) {
				// auth only
				rest_auth_url = Config.get('siop_auth_server_url');
			}
			else if (Config && (Config.get)  && (Config.get('siop_authkey_server_url'))) {
				// dual auth & key
				rest_auth_url = Config.get('siop_authkey_server_url');
			}
	
			
			if (Config && (Config.get)  && (Config.get('siop_auth_server_api_path'))) {
				// auth only
				rest_auth_api_path = Config.get('siop_auth_server_api_path');
			}
			else if (Config && (Config.get)  && (Config.get('siop_authkey_server_api_path'))) {
				// dual auth & key
				rest_auth_api_path = Config.get('siop_authkey_server_api_path');
			}
			
			if (rest_auth_url && rest_auth_api_path)
				rest_auth_connection = session.createRestConnection(rest_auth_url, rest_auth_api_path);
			else
				rest_auth_connection = session.createRestConnection(rest_server_url, rest_server_api_path);
	
			
			//
			// rest_key_connection
			//
			if (Config && (Config.get)  && (Config.get('siop_key_server_url'))) {
				// key only
				rest_key_url = Config.get('siop_key_server_url');
			}
			else if (Config && (Config.get)  && (Config.get('siop_authkey_server_url'))) {
				// dual auth & key
				rest_key_url = Config.get('siop_authkey_server_url');
			}
	
			if (Config && (Config.get)  && (Config.get('siop_key_server_api_path'))) {
				// key only
				rest_key_api_path = Config.get('siop_key_server_api_path');
			}
			else if (Config && (Config.get)  && (Config.get('siop_authkey_server_api_path'))) {
				// dual auth & key
				rest_key_api_path = Config.get('siop_authkey_server_api_path');
			}
	
	
			if (rest_key_url && rest_key_api_path)
				rest_key_connection = session.createRestConnection(rest_key_url, rest_key_api_path);
			else
				rest_key_connection = session.createRestConnection(rest_server_url, rest_server_api_path);
		}
		

		
		// set connection
		if (rest_auth_connection)
		authkey_server_access_instance.setRestAuthConnection(rest_auth_connection);
		
		if (rest_key_connection)
		authkey_server_access_instance.setRestKeyConnection(rest_key_connection);

		// return this interface
		if (result[0])
		result[0] = authkey_server_access_instance; // replace actual result (even if it is good because of clientmodules.setSessionNetworkConfig)
		else
		result.push(authkey_server_access_instance);


		result.push({module: this.name, handled: true, stop: true});
		
		return true;
	}

	_getAppObject() {
		var global = this.global;
		if (global.getAppObject)
			return global.getAppObject();
	}

	getSiopInterface() {
		var global = this.global;
		
		if (this.siop_interface)
			return this.siop_interface;
		
		var siopinterface = null;

		var result = []; 
		var inputparams = [];
		
		inputparams.push(this);
		
		result[0] = new this.SiopServerInterface(this);
		
		// call hook to let modify or replace instance
		var ret = global.invokeHooks('getSiopInterface_hook', result, inputparams);
		
		if (ret && result[0]) {
			siopinterface = result[0];
		}
		else {
			siopinterface = new this.SiopServerInterface(this);
		}
		
		this.siop_interface = siopinterface;
		
		return this.siop_interface;
	}

	getSiopServerAccessInstance(session, providername) {
		var siopinterface = this.getSiopInterface();

		return siopinterface.getSiopServerAccessInstance(session, providername);
	}

	

	
	//
	// API
	//
	

	//
	// control
	//
	
	getControllersObject() {
		if (this.controllers)
			return this.controllers;
		
		this.controllers = new this.Controllers(this);
		
		return this.controllers;
	}

	//
	// model
	//
	
	
}

if ( typeof window !== 'undefined' && typeof window.GlobalClass !== 'undefined' && window.GlobalClass ) {
	let _GlobalClass = window.GlobalClass;
	_GlobalClass.getGlobalObject().registerModuleObject(new Module());

	// dependencies
	_GlobalClass.getGlobalObject().registerModuleDepency('siop', 'clientmodules');
}
else if (typeof window !== 'undefined') {
	let _GlobalClass = ( window && window.simplestore && window.simplestore.Global ? window.simplestore.Global : null);
	
	_GlobalClass.getGlobalObject().registerModuleObject(new Module());

	// dependencies
	_GlobalClass.getGlobalObject().registerModuleDepency('siop', 'clientmodules');
}
else if (typeof global !== 'undefined') {
	// we are in node js
	let _GlobalClass = ( global && global.simplestore && global.simplestore.Global ? global.simplestore.Global : null);
	
	_GlobalClass.getGlobalObject().registerModuleObject(new Module());

	// dependencies
	_GlobalClass.getGlobalObject().registerModuleDepency('siop', 'clientmodules');
}