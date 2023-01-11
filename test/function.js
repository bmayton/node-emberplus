const EmberClient = require("../EmberClient");
const EmberLib = require("../EmberLib");
const TreeServer = require("../EmberServer").EmberServer;
const {jsonRoot} = require("./utils");
const BER = require("../ber");
const Decoder = EmberLib.DecodeBuffer;
const S101Client = require("../EmberSocket").S101Client;
const fs = require("fs");

let HOST;
let PORT;
const TINYEMBER = false;


const jsonTree = jsonRoot();
const eee = TreeServer.JSONtoTree(jsonTree);


const PATH = "0.0.1";

// function getRoot() {
//     return new Promise((resolve, reject) => {
//         fs.readFile("test/embrionix.ember", (e, data) => {
//             if (e) {
//                 reject(e);
//             }
//             try {
//                 resolve(Decoder(data));
//             }
//             catch(error) {
//                 reject(error);
//             }
//         });
//     });
// }

const wait = function(t) {
    return new Promise(resolve => {
        setTimeout(resolve, t);
    });
}

if (TINYEMBER) {
    HOST = "192.168.4.4";
    PORT = 9092;
    //HOST = "192.168.0.235";
    //PORT = 9000;
}
else {
    HOST = "127.0.0.1";
    PORT = 9000;
}





const client = new EmberClient(HOST, PORT);
const codec = new S101Client();
const MATRIX_PATH = "0.1.0";

function clientData(node) {
    console.log("received event for ", node.toJSON());
}

let server;
let start = Promise.resolve();
start = start
//.then(() => getRoot())
.then(root => {
    root = TreeServer.JSONtoTree(jsonRoot());
    //root.addElement(new EmberLib.Node(1));
    server = new TreeServer(HOST, PORT, root);
    //server._debug = true;
    server.on("error", e => {
        console.log("Server Error", e);
    });
    server.on("clientError", info => {
        console.log("clientError", info.error);
    });
    server.on("event", event => {
        console.log("Event: " + event);
    });
    return server.listen()
})

.then(() => client.connect())
.then(() => client.expand())
.then(() => client.getElementByPath("1"))
.then(node1 => {
    console.log(node1);
    // const streamCollection = new EmberLib.StreamCollection();                    
    // const children = node1.getChildren();
    // let count = 0;
    // for(let child of children) {
    //     client.subscribe(child, () => { count++; });
    //     streamCollection.addEntry(new EmberLib.StreamEntry(child.contents.streamIdentifier, 999));
    // }
    // // prepare StreamCollection
    // const root = new EmberLib.Root();
    // root.setStreams(streamCollection);
    // client._client.emit('emberTree', root);
})
.catch(e => {
    console.log(e.stack);
    console.log(e);
})
.then(() => {
    client.disconnect();
    if (!TINYEMBER) {
        server.close();
    }
});
