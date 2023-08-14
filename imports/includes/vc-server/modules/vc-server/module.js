'use strict';

var Module = class {
	
	constructor() {
		this.name = 'verifiablecredentials-server';
		this.current_version = "0.30.13.2023.01.03";
		
		this.global = null; // put by global on registration
		this.isready = false;
		this.isloading = false;
		
		this.verifiablecredentials_server_interface = null;
		
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

		// verifiablecredentials-server module script loader
		var modulescriptloader;
		
		// look if verifiablecredentialsserverloader already created (e.g. for loading in node.js)
		modulescriptloader = global.findScriptLoader('verifiablecredentialsserverloader');

		// if not, create on as child as parent script loader passed in argument
		if (!modulescriptloader)
		modulescriptloader = global.getScriptLoader('verifiablecredentialsserverloader', parentscriptloader);
		
		var xtraroot = './vc-server';
		var moduleroot = xtraroot + '/modules/vc-server';
		
		var interfaceroot = xtraroot + '/interface';

		modulescriptloader.push_script( interfaceroot + '/verifiablecredentials-access.js');
		modulescriptloader.push_script( interfaceroot + '/verifiablecredentials-socket.js');

		//modulescriptloader.push_script( moduleroot + '/control/controllers.js');
		
		modulescriptloader.push_script( moduleroot + '/model/verifiablecredentials-server.js');

		
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
		rootscriptloader.signalEvent('on_verifiablecredentials_servermodule_ready');
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
		
		versioninfo.label = global.t('verifiablecredentials-server');
		versioninfo.value = this.current_version;

		versioninfos.push(versioninfo);

		
		result.push({module: this.name, handled: true});
		
		return true;
	}
	
	
	// objects
	getVerifiableCredentialsServerInterface() {
		var global = this.global;
		
		if (this.verifiablecredentials_serverinterface)
			return this.verifiablecredentials_serverinterface;
		
		var vcserverinterface = null;

		var result = []; 
		var inputparams = [];
		
		inputparams.push(this);
		
		result[0] = new this.VerifiableCredentialsServerInterface(this);
		
		// call hook to let modify or replace instance
		var ret = global.invokeHooks('getVerifiableCredentialsServerInterface_hook', result, inputparams);
		
		if (ret && result[0]) {
			vcserverinterface = result[0];
		}
		else {
			vcserverinterface = new this.VerifiableCredentialsServerInterface(this);
		}
		
		this.verifiablecredentials_serverinterface = vcserverinterface;
		
		return this.verifiablecredentials_serverinterface;
	}
	
	
	getVerifiableCredentialsServerAccessInstance(session) {
		var verifiablecredentials_server_interface = this.getVerifiableCredentialsServerInterface();
		
		return verifiablecredentials_server_interface.getVerifiableCredentialsServerAccessInstance(session);

	}

	getVerifiableCredentialsServerSocketInstance(session) {
		var verifiablecredentials_server_interface = this.getVerifiableCredentialsServerInterface();
		
		return verifiablecredentials_server_interface.getVerifiableCredentialsServerSocketInstance(session);
	}

	//
	// API
	//
	async getInitiationUrl(session, options) {
		var global = this.global;
		const Utils = global.getModuleClass('crypto-did', 'Utils');

		var openid_url;

		let sessionuuid = session.getSessionUUID();

		let params = options;
		let vc_config = params.vc_config;

		switch(params.workflow_version) {
			case 'v2': {
				switch(params.method) {
					case 'initiate_issuance': {
						openid_url = 'openid://';
		
						openid_url += 'initiate_issuance?';
						openid_url += 'issuer=' + encodeURIComponent(vc_config.rest_server_url + vc_config.rest_server_vc_api_path);
						openid_url += '&credential_type=' + encodeURIComponent(params.credential_type);
	
						if (options.flow_connection !== 'off')
						openid_url += '&conformance=' + (params.conformance ? params.conformance : sessionuuid);
					}
					break;
		
					case 'initiate_verification': {
						openid_url = 'openid://';
		
						openid_url += '?'; // method (should be something like verify)
						openid_url += 'scope=openid';
						openid_url += '&response_type=id_token';
				
						openid_url += '&client_id=' + encodeURIComponent(params.client_id);
						
						let redirect_uri = vc_config.rest_server_url + vc_config.rest_server_api_path + '/verifiablecredentials';
						redirect_uri += (params.ebsi_conformance_v2 ? '/verifier-mock/authentication-responses' : '/verifier/present');
						openid_url += '&redirect_uri=' + encodeURIComponent(redirect_uri);
		
						openid_url += '&nonce=' + (params.nonce ? params.nonce : session.guid());
						
						if (options.flow_connection !== 'off')
						openid_url += '&conformance=' + (params.conformance ? params.conformance : sessionuuid);
		
						if (params.claims_string)
						openid_url += '&claims='  + params.claims_string;
		
					}
					break
				}
			}
			break;

			case 'v3': {
				let client_token = (params.client_id ? (params.client_key ? params.client_id + '_' + params.client_key :params.client_id) : null)

				switch(params.method) {
					case 'initiate_issuance': {
						openid_url = 'openid-credential-offer://';

						let credential_offer_uri = vc_config.rest_server_url + vc_config.rest_server_vc_api_path;

						credential_offer_uri += (client_token ? '/' + client_token : '');
						credential_offer_uri += '/issuer/credential/offer';

						let credentialOfferId = (params.credentialOfferId ? params.credentialOfferId : null);

						if (!credentialOfferId) {
							if (options.flow_connection !== 'off')
							credentialOfferId = (params.nonce ? sessionuuid + '_' + params.nonce : null);
						}

						credential_offer_uri += (credentialOfferId ? '/' + credentialOfferId : '');

						if (options.flow_connection === 'off') {
							// things that we won't pass to server with the first call of initiation sequence
							credential_offer_uri += '?credential_type=' + params.credential_type;
							credential_offer_uri += '&flow_type=' + params.flow_type;
							credential_offer_uri += (params.client_did ? '&client_id=' + params.client_did : '');
						}


						openid_url += '?credential_offer_uri=' + encodeURIComponent(credential_offer_uri);

					}
					break;
		
					case 'initiate_verification': {
						openid_url = 'openid-credential-call://';
		
						openid_url += '?'; // method (should be something like verify)
						openid_url += 'scope=openid';
						openid_url += '&response_type=id_token';
				
						openid_url += '&client_id=' + encodeURIComponent(params.client_id);
						
						let redirect_uri = vc_config.rest_server_url + vc_config.rest_server_api_path + '/verifiablecredentials';
						redirect_uri += (params.ebsi_conformance_v2 ? '/verifier-mock/authentication-responses' : '/verifier/present');
						openid_url += '&redirect_uri=' + encodeURIComponent(redirect_uri);
		
						openid_url += '&nonce=' + (params.nonce ? params.nonce : session.guid());
						
						if (options.flow_connection !== 'off')
						openid_url += '&conformance=' + (params.conformance ? params.conformance : sessionuuid);
		
						if (params.claims_string)
						openid_url += '&claims='  + params.claims_string;
					}
					break
				}
			}
			break;

		}

		return openid_url;
	}

	async fetchInitiationUrl(session, options) {
		var global = this.global;
		var cryptodidmodule = global.getModuleObject('crypto-did');

		let openid_url = await cryptodidmodule.fetchInitiationUrl(session, options);

		// TEST
		var cryptodidmodule = global.getModuleObject('crypto-did');

		// issuance
		var _options;

/* 		_options = {method: 'initiate_issuance'};
		_options.conformance = 'f1db0ef0-6dfa-4af9-84a6-d27f7bb22683';
		_options.flow_type = 'cross-device';
		_options.rest_url = 'https://api-conformance.ebsi.eu/conformance/v2';

		openid_url = await cryptodidmodule.fetchInitiationUrl(session, _options); */

		// verification
/* 		_options = {method: 'initiate_verification'};
		_options.conformance = 'f1db0ef0-6dfa-4af9-84a6-d27f7bb22683';
		_options.credential_type = 'verifiable-id';
		_options.flow_type = 'cross-device';
		let redirect_uri = 'https://api-conformance.ebsi.eu/conformance/v2/verifier-mock/authentication-responses';
		_options.rest_url = redirect_uri.substring(0, redirect_uri.lastIndexOf('/'));

		openid_url = await cryptodidmodule.fetchInitiationUrl(session, _options); */

		// TEST

		return openid_url;
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
_GlobalClass.getGlobalObject().registerModuleDepency('verifiablecredentials-server', 'common');
