'use strict';

var Module = class {
	
	constructor() {
		this.name = 'cryptokey-block';
		this.current_version = "0.30.13.2023.01.03";
		
		this.global = null; // put by global on registration
		this.isready = false;
		this.isloading = false;
		
		this.cryptokey_server_interface = null;
		
		this.controllers = null;
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

		// cryptokey module script loader
		var modulescriptloader;
		
		// look if oauth2loader already created (e.g. for loading in node.js)
		modulescriptloader = global.findScriptLoader('cryptoblockkeyloader');

		// if not, create on as child as parent script loader passed in argument
		if (!modulescriptloader)
		modulescriptloader = global.getScriptLoader('cryptoblockkeyloader', parentscriptloader);
		
		var xtraroot = './cryptokey-block';
		var moduleroot = xtraroot + '/modules/cryptokey-block';
		
		var interfaceroot = xtraroot + '/interface';

		modulescriptloader.push_script( interfaceroot + '/cryptokey-block-access.js');
		modulescriptloader.push_script( interfaceroot + '/xtra-cryptokey-block-access.js');

		//modulescriptloader.push_script( moduleroot + '/control/controllers.js');
		
		modulescriptloader.push_script( moduleroot + '/model/cryptokey-block-interface.js');

		
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
		global.modifyHookPriority('getVersionInfo_hook', this.name, -5);
		
		// signal module is ready
		var rootscriptloader = global.getRootScriptLoader();
		rootscriptloader.signalEvent('on_cryptokey_servermodule_ready');
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
		
		var versioninfos = params[0];
		
		var versioninfo = {};
		
		versioninfo.label = global.t('cryptokey-block');
		versioninfo.value = this.current_version;

		versioninfos.push(versioninfo);

		
		result.push({module: this.name, handled: true});
		
		return true;
	}
	
	
	// objects
	getCryptoKeyBlockInterface() {
		var global = this.global;
		
		if (this.cryptokey_serverinterface)
			return this.cryptokey_serverinterface;
		
		var cryptokeyblockinterface = null;

		var result = []; 
		var inputparams = [];
		
		inputparams.push(this);
		
		result[0] = new this.CryptoKeyBlockInterface(this);
		
		// call hook to let modify or replace instance
		var ret = global.invokeHooks('getCryptoKeyBlockInterface_hook', result, inputparams);
		
		if (ret && result[0]) {
			cryptokeyblockinterface = result[0];
		}
		else {
			cryptokeyblockinterface = new this.CryptoKeyBlockInterface(this);
		}
		
		this.cryptokey_serverinterface = cryptokeyblockinterface;
		
		return this.cryptokey_serverinterface;
	}
	
	
	//
	// API
	//
	getCryptoKeyBlockAccessInstance(session) {
		var cryptokey_server_interface = this.getCryptoKeyBlockInterface();
		
		return cryptokey_server_interface.getCryptoKeyBlockAccessInstance(session);

	}



	
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
_GlobalClass.getGlobalObject().registerModuleDepency('cryptokey-block', 'common');
