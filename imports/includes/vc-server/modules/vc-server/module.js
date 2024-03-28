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
	_getBufferClass() {
		var _Buffer;
		try {
			if (typeof window !== 'undefined' && typeof window.Buffer !== 'undefined') {
				_Buffer = window.Buffer;
			} else {
				_Buffer = require('buffer').Buffer;
			}
		} catch (e) {
		}
		
		return _Buffer;
	}

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
						openid_url += '&response_type=' + (params.response_type ? params.response_type : 'id_token');
				
						openid_url += '&client_id=' + encodeURIComponent(params.client_id);
						
						let redirect_uri = vc_config.rest_server_url + vc_config.rest_server_api_path + '/verifiablecredentials';
						redirect_uri += (params.ebsi_conformance_v2 ? '/verifier-mock/authentication-responses' : '/verifier/present');
						openid_url += '&redirect_uri=' + encodeURIComponent(redirect_uri);
		
						openid_url += '&nonce=' + (params.nonce ? params.nonce : session.guid());
						
						if (options.flow_connection !== 'off')
						openid_url += '&conformance=' + (params.conformance ? params.conformance : sessionuuid);
		
						if (params.claims_string)
						openid_url += '&claims='  + params.claims_string;
		
						if (params.request_uri)
						openid_url += '&request_uri='  + params.request_uri;
		
						if (params.state)
						openid_url += '&state='  + params.state;
		
						if (params.presentation_definition_string)
						openid_url += '&presentation_definition='  + params.presentation_definition_string;
		
						if (params.response_mode)
						openid_url += '&response_mode='  + params.response_mode;
		
					}
					break
				}
			}
			break;

			case 'v3': {
				let client_token = (params.client_id ? (params.client_key ? params.client_id + '_' + params.client_key :params.client_id) : null)

				switch(params.method) {
					case 'initiate_issuance': {
						openid_url = (params.credential_offer_endpoint ? params.credential_offer_endpoint : 'openid-credential-offer://');

						let credential_offer_uri = vc_config.rest_server_url + vc_config.rest_server_vc_api_path;

						credential_offer_uri += (client_token ? '/' + client_token : '');
						credential_offer_uri += '/issuer/credential/offer';

						let credentialOfferId = (params.credentialOfferId ? params.credentialOfferId : null);

						if (!credentialOfferId) {
							if (options.flow_connection !== 'off')
							credentialOfferId = (params.nonce ? sessionuuid + '_' + params.nonce : null);
						}


						if (options.flow_connection === 'off') {
							// things that we won't pass to server with the first call of initiation sequence
							let query_string = '';
							query_string += '?credential_type=' + params.credential_type;
							query_string += '&flow_type=' + params.flow_type;
							query_string += (params.client_did ? '&client_id=' + params.client_did : '');

							// transform in a b64 pseudo credentialOfferId
							var _Buffer = this._getBufferClass();
							credential_offer_uri += '/' + 'b64_' + _Buffer.from(query_string).toString('base64');
						}
						else {
							credential_offer_uri += (credentialOfferId ? '/' + credentialOfferId : '');
						}

						openid_url += '?credential_offer_uri=' + encodeURIComponent(credential_offer_uri);
					}
					break;
		
					case 'initiate_verification': {
						openid_url = (params.credential_call_endpoint ? params.credential_call_endpoint : 'openid://');

						// specific to primus

						let credential_call_uri = vc_config.rest_server_url + vc_config.rest_server_vc_api_path;

						credential_call_uri += (client_token ? '/' + client_token : '');
						credential_call_uri += '/verifier/credential/call';

						if (options.flow_connection === 'off') {
							// things that we won't pass to server with the first call of initiation sequence
							let query_string = '';
	
							query_string += '?scope=openid';
							query_string += '&response_type=id_token';
					
							query_string += '&client_id=' + encodeURIComponent(params.client_id);
							query_string += '&client_key=' + encodeURIComponent(params.client_key);
							
							let redirect_uri = vc_config.rest_server_url + vc_config.rest_server_api_path + '/verifiablecredentials';
							redirect_uri += (params.ebsi_conformance_v2 ? '/verifier-mock/authentication-responses' : '/verifier/present');
							query_string += '&redirect_uri=' + encodeURIComponent(redirect_uri);
			
							query_string += '&nonce=' + (params.nonce ? params.nonce : session.guid());
							
							//credential_call_uri += '&conformance=' + (params.conformance ? params.conformance : sessionuuid);

							if (params.flow_type)
							query_string += '&flow_type='  + params.flow_type;
			
							if (params.claims_string)
							query_string += '&claims='  + params.claims_string;

							// transform in a b64 pseudo credentialCallId
							var _Buffer = this._getBufferClass();
							credential_call_uri += '/' + 'b64_' + _Buffer.from(query_string).toString('base64');
						}
						else {
							credential_call_uri += ( params.credentialCallId ? '/' + params.credentialCallId : '');

						}

						switch(params.flow_type) {
							case 'openidvc': {
								openid_url = 'openid-vc://';

								openid_url += '?scope=' + (params.scope ? params.scope : 'openid4vp');
								openid_url += '&client_id=' + params.client_id;

								credential_call_uri += '?workflow_version=v3&flow_type=openidvc';
								openid_url += '&request_uri=' + encodeURIComponent(credential_call_uri)
							}
							break;

							case 'credential-call': {
								openid_url = 'openid-credential-call://';

								openid_url += '?scope=' + (params.scope ? params.scope : 'openid-credential-call');
								openid_url += '&client_id=' + params.client_id;

								credential_call_uri += '?workflow_version=v3&flow_type=credential-call';
								openid_url += '&request_uri=' + encodeURIComponent(credential_call_uri)
							}
							break;

							default: {
								openid_url += '?scope=' + (params.scope ? params.scope : 'openid4vp');
								openid_url += '&client_id=' + params.client_id;

								openid_url += '&request_uri=' + encodeURIComponent(credential_call_uri)
							}
							break;
						}
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
