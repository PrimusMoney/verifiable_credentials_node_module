'use strict';

console.log('node-load.js');

class CheckModulesLoad {
	constructor(rootscriptloader, signalstring) {
		this.rootscriptloader = rootscriptloader;
		this.array = [];

		this.signalsent = false;
		this.signalstring = signalstring;
	}

	wait(modulename) {
		this.array.push({name: modulename, loaded: false});
	}

	check(modulename) {
		var arr = this.array;

		if (modulename) {
			for (var i = 0; i < arr.length; i++) {
				var entry = arr[i];
	
				if (entry.name == modulename) {
					entry.loaded = true;
					break;
				}
			}
		}

		for (var i = 0; i < arr.length; i++) {
			var entry = arr[i];

			if (entry.loaded !== true)
				return;
		}

		if (this.signalsent)
		return;
		
		// mark loads have finished
		var rootscriptloader = this.rootscriptloader;
		
		rootscriptloader.signalEvent(this.signalstring);
		this.signalsent = true;
	}
}


class NodeLoad {
	constructor(node_module) {
		this.name = 'nodeload';
		
		this.node_module = node_module;
	}
	
	init(callback) {
		console.log('NodeLoad.init called');
		
		try {
			var self = this;
			var _globalscope = global; // nodejs global
			var _noderequire = require; // to avoid problems when react-native processes files
			
			// get primus_react_client_wallet
			var primus_client_wallet = this.node_module.primus_client_wallet;
			
			if (primus_client_wallet.initialized === false) {
				console.log('WARNING: @primusmone/client_wallet should be initialized before initializing @primusmoney/verifiable_credentials');
			}
			
			// get node module objects
			var Bootstrap = _globalscope.simplestore.Bootstrap;
			var ScriptLoader = _globalscope.simplestore.ScriptLoader;
	
			var bootstrapobject = Bootstrap.getBootstrapObject();
			var rootscriptloader = ScriptLoader.getRootScriptLoader();
			
			var GlobalClass = _globalscope.simplestore.Global;
	
			// loading dapps
			let modulescriptloader = ScriptLoader.findScriptLoader('moduleloader');
			
			let verifiablecredentialsscriptloader = modulescriptloader.getChildLoader('@primusmoney/verifiable_credentials');
			
			// setting script root dir to this node module
			// instead of ethereum_core/imports
			var path = _noderequire('path');
			var script_root_dir = path.join(__dirname, '../imports');
			verifiablecredentialsscriptloader.setScriptRootDir(script_root_dir);
			
			
			//modulescriptloader.setScriptRootDir(script_root_dir); // because xtra_web uses modulescriptloader instead of xtra_webmodulescriptloader
	
			// multiple module load signalling
			var checkmodulesload = new CheckModulesLoad(rootscriptloader, 'on_verifiable_credentials_module_ready');
			

			
			// crypto-did module
			ScriptLoader.reclaimScriptLoaderName('cryptodidloader'); // in case another node module used this name
			verifiablecredentialsscriptloader.getChildLoader('cryptodidloader'); // create loader with correct root dir

			verifiablecredentialsscriptloader.push_script('./includes/module.js', function () {
				console.log('crypto-did module loaded');
			});

			// crypto-did module ready (sent by crypto-did module at the end of registerHooks)
			checkmodulesload.wait('crypto-did');
			rootscriptloader.registerEventListener('on_crypto_did_module_ready', function(eventname) {
				checkmodulesload.check('crypto-did');
			});



			// start loading verifiablecredentialsscriptloader
			verifiablecredentialsscriptloader.load_scripts(function () {
				var _nodeobject = GlobalClass.getGlobalObject();
				
				// loading xtra pushed in verifiablecredentialsscriptloader
				verifiablecredentialsscriptloader.load_scripts(function() {
					checkmodulesload.check();
				});
			});

			
			
			// end of modules load
			rootscriptloader.registerEventListener('on_verifiable_credentials_module_ready', function(eventname) {
				if (callback)
					callback(null, self);
			});
		}
		catch(e) {
			console.log('exception in NodeLoad.init: ' + e);
			console.log(e.stack);
		}

		
	}
		
}


module.exports = NodeLoad;




