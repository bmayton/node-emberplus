const fs = require("fs");
const {EmberServer} = require("../EmberServer");
const Decoder = require('../EmberLib').DecodeBuffer;
const EmberClient = require("../EmberClient");

const HOST = "127.0.0.1";
const PORT = 9010;

function getRoot() {
    return new Promise((resolve, reject) => {
        fs.readFile("test/embrionix.ember", (e, data) => {
            if (e) {
                reject(e);
            }
            try {
                resolve(Decoder(data));
            }
            catch(error) {
                reject(error);
            }
        });
    });
}

let server;
describe("EmberClient", () => {
    
    beforeEach(() => {
        return getRoot()
        .then(root => {
            server = new EmberServer(HOST, PORT, root);
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
        });
    });

    afterEach(() => {
        return server.close();
    });

    it("should be able to fetch a specific node", () => {
        const client = new EmberClient(HOST, PORT);
        const PATH = "0.1";
        client.on("error", () => {
            // ignore
        });
        return Promise.resolve()
            .then(() => client.connect())
            .then(() => client.getDirectory())
            .then(() => client.getElementByPath(PATH))
            .then(node => {
                expect(node).toBeDefined();
                expect(node.getPath()).toBe(PATH);
                return client.disconnect();
            });
    });
});
