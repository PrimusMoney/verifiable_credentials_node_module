class WebMethodSubModule {
	constructor(crypto_did_module) {
		this.crypto_did_module = crypto_did_module;
		this.global = crypto_did_module.global;
	}

	async verifyVerifiableCredentialJWT(verifier, audience, vc_jwt, vc_obj, vc_verification) {
		var session = verifier.session;
		var global = session.getGlobalObject();

		const Utils = global.getModuleClass('crypto-did', 'Utils');

		let iss_did = (vc_obj && vc_obj.payload ? vc_obj.payload.iss : null);
		let vc_issuer_did = (vc_obj && vc_obj.payload && vc_obj.payload.vc 
			&& vc_obj.payload.vc.issuer ? vc_obj.payload.vc.issuer : null);

		if (iss_did != vc_issuer_did) {
			vc_verification.result = false;
			vc_verification.error = 'iss and vc.issuer must match';
		}

		try {
			vc_verification.is_did_registered = -1;
			vc_verification.is_did_trusted_issuer = -1;
			vc_verification.is_did_credential_revoked = 0;

			const DidWebRegistries = require('@p2pmoney-org/did_web_registries');
			//const DidWebRegistries = require('./only_for_dev/did_web_registries');

			let web_registry_server = await DidWebRegistries.getRegistryServerForDid(iss_did).catch(err => {});

			if (web_registry_server) {
				// check that issuer's identifier exists on the registry
				let did_document = await web_registry_server.did_registry_did_document(iss_did);

				if (did_document) {
					let card = await DidWebRegistries.getCredentialVerificationCard(vc_jwt);

					// 6 - VC authority of issuer validation (depending on the Trust Model, e.g. accreditation) at issuance time.
					if (card) {
		
						vc_verification.is_did_registered = card.is_did_registered;
		
						// check that issuer is a registered issuer
						vc_verification.is_did_trusted_issuer = card.is_did_trusted_issuer;
		
						// get status and identity elements of RootTAO
						vc_verification.RootTAO = (card.RootTAO ? card.RootTAO : {identity: {}});
			
						// get status and identity elements of TAO
						vc_verification.TAO = (card.TAO ? card.TAO : {identity: {}});
		
						// get status and identity elements of TI
						vc_verification.TI = card.TI;
		
						// 5 - VC validity status (e.g. not revoked nor suspended)
		
						// check that credential is signed with a published public key
						vc_verification.is_credential_signing_publicly_confirmed = card.is_credential_signing_publicly_confirmed;
		
						// check that credential has not been revoked
						vc_verification.is_credential_revoked = card.is_credential_revoked;
					}
					else {
						vc_verification.result = false;
						vc_verification.error = 'could not retrieve verification elements for credential';
					}
				}
				else {
					vc_verification.result = false;
					vc_verification.error = 'could not find did document for: ' + iss_did;
				}
			
			}
			else {
				vc_verification.result = false;
				vc_verification.error = 'could not access did:web registries';
			}

	
		}
		catch(e) {
			console.log('exception: ' + e);
		}
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

_GlobalClass.registerModuleClass('crypto-did', 'WebMethodSubModule', WebMethodSubModule);