'use strict';

var verifiable_credentials;

class Verifiable_Credentials {
	constructor() {
		this.load = null;
		
		this.initializing = false;
		this.initialized = false;
		
		this.initializationpromise = null;
		
		var PrimusMoney_client_wallet = require('@primusmoney/client_wallet');
		//var PrimusMoney_client_wallet = require('../../@primusmoney/client_wallet');
		
		this.primus_client_wallet = PrimusMoney_client_wallet.getObject();
	}

	getVersion() {
		var packagejson = require('./package.json');
		return packagejson.version;
	}
	
	async init(callback) {
		console.log('@p2pmoney-org/verifiable_credentials init called');
		
		if (this.initialized) {
			console.log('module @p2pmoney-org/verifiable_credentials is already initialized.');
			return true;
		}
		
		if (this.initializing ) {
			console.log('module @p2pmoney-org/verifiable_credentials is alreay initializing. Wait till it\'s ready.');
			return this.initializationpromise;
		}

		// @primusmoney dependencies
		var primus_client_wallet = this.primus_client_wallet;

		if (primus_client_wallet.initialized === false) {
			await primus_client_wallet.init();
		}

		// create loader
		if (typeof window !== 'undefined') {
			if (typeof document !== 'undefined' && document ) {
				// we are in a browser
				console.log('loading for browser');
				
				var BrowserLoad = require( './js/browser-load.js');

				this.load = new BrowserLoad(this);
			}
			else {
				// we are in react-native
				console.log('loading for react-native');
				
				var ReactNativeLoad = require( './js/react-native-load.js');

				this.load = new ReactNativeLoad(this);
			}	
		}
		else if (typeof global !== 'undefined') {
			console.log('loading for nodejs');
			
			// we are in nodejs
			var NodeLoad = require( './js/node-load.js');
			
			this.load = new NodeLoad(this);
		}

		var self = this;
		var promise;
		
		if (this.initializing === false) {
			
			this.initializationpromise = new Promise(function (resolve, reject) {
				self.load.init(function() {
				console.log('@p2pmoney-org/verifiable_credentials init finished');
				self.initialized = true;
				
				if (callback)
					callback(null, true);
				
				resolve(true);
				});
			});
			
			this.initializing = true;
		}
		
		return this.initializationpromise;
	}
	
	getGlobalObject() {
		if (typeof window !== 'undefined') {
			// we are in react-native
			return window.simplestore.Global.getGlobalObject();
		}
		else if (typeof global !== 'undefined') {
			// we are in nodejs
			return global.simplestore.Global.getGlobalObject();
		}
		
	}

	// static methods
	static getObject() {
		if (verifiable_credentials)
			return verifiable_credentials;
		
		verifiable_credentials = new Verifiable_Credentials();
		
		return verifiable_credentials;
	}
	
}

module.exports = Verifiable_Credentials;