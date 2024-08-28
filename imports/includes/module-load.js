import './module.js';

// common
import './common/async-rest-connection.js';

// utils
import './utils/utils.js';


// credentials
import './credentials/fetcher.js';

// cryptokey block (enclave like)
import './cryptokey-block/interface/cryptokey-block-access.js';
import './cryptokey-block/interface/xtra-cryptokey-block-access.js';

import './cryptokey-block/modules/cryptokey-block/module.js';

import './cryptokey-block/modules/cryptokey-block/model/cryptokey-block-interface.js';

// did
import './did/cryptocard.js';
import './did/did.js';

// did methods

// ebsi method
import './did-methods/ebsi/ebsi-submodule.js';
import './did-methods/ebsi/ebsi-did-document.js';
import './did-methods/ebsi/ebsi-server.js';
import './did-methods/ebsi/ebsi-trusted-issuer.js';
import './did-methods/ebsi/ebsi-trusted-policy.js';
import './did-methods/ebsi/ebsi-trusted-schema.js';

// key method
import './did-methods/key/key-submodule.js';

// web method
import './did-methods/web/web-submodule.js';
import './did-methods/web/web-server.js';
import './did-methods/web/web-certificate.js';


// json web
import './jw/jw-cryptokeys.js';
import './jw/jwt.js';

// siop
import './siop/interface/siop-access.js';

import './siop/modules/siop/module.js';

import './siop/modules/siop/model/siop.js';

// vc-connect-client
import './vc-connect-client/client-rest-connection/vc-rest-server.js';

import './vc-connect-client/client-web-socket/client-web-socket.js';
import './vc-connect-client/client-web-socket/web-socket-server.js';

import './vc-connect-client/pair-connection/remote-pair-calls.js';

// verifiable credentials server access
import './vc-server/interface/verifiablecredentials-access.js';
import './vc-server/interface/verifiablecredentials-socket.js';

import './vc-server/modules/vc-server/module.js';

import './vc-server/modules/vc-server/model/verifiablecredentials-server.js';