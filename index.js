/**
 * @author PrimusMoney
 * @name @primusmoney/verifiable_credentials
 * @homepage http://www.primusmoney.com/
 * @license MIT
 */
'use strict';


console.log('@primusmoney/verifiable_credentials node module');

if ( typeof window !== 'undefined' && window  && (typeof window.simplestore === 'undefined')) {
	// react-native
	console.log('creating window.simplestore in @primusmoney/verifiable_credentials index.js');

	window.simplestore = {};
	
	window.simplestore.nocreation = true;
	
} else if ((typeof global !== 'undefined') && (typeof global.simplestore === 'undefined')) {
	// nodejs
	console.log('creating global.simplestore in @primusmoney/verifiable_credentials index.js');
	global.simplestore = {};
}

const Verifiable_Credentials = require('./verifiable_credentials.js');


module.exports = Verifiable_Credentials