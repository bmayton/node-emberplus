const fs = require("fs");
const Decoder = require('../').Decoder;
const DeviceTree = require("../").DeviceTree;
const TreeServer = require("../").TreeServer;

const LOCALHOST = "127.0.0.1";
const UNKNOWN_HOST = "192.168.99.99";
const PORT = 9008;

describe("DeviceTree", () => {
    describe("With server", () => {
        let server;
        beforeAll(() => {
            return Promise.resolve()
                .then(() => new Promise((resolve, reject) => {
                    fs.readFile("./embrionix.ember", (e, data) => {
                        if (e) {
                            reject(e);
                        }
                        resolve(Decoder(data));
                    });
                }))
                .then(root => {
                    server = new TreeServer(LOCALHOST, PORT, root);
                    return server.listen();
                });
        });

        afterAll(() => server.close());

        it("should gracefully connect and disconnect", () => {
            return Promise.resolve()
                .then(() => {
                    let tree = new DeviceTree(LOCALHOST, PORT);
                    return Promise.resolve()
                        .then(() => tree.connect())
                        .then(() => tree.getDirectory())
                        .then(() => tree.disconnect())
                        .then(() => tree.connect())
                        .then(() => tree.getDirectory())
                        .then(() => tree.disconnect())
                })
        });

        it("should not disconnect after 5 seconds of inactivity", () => {
            return Promise.resolve()
                .then(() => {
                    let tree = new DeviceTree(LOCALHOST, PORT);

                    tree.on("error", error => {
                        throw error;
                    });

                    return Promise.resolve()
                        .then(() => tree.connect())
                        .then(() => new Promise(resolve => setTimeout(resolve, 5000)))
                        .then(() => tree.disconnect())
                })
        }, 7000);
    });

    it("timeout should be taken into account when connecting to unknown host", () => {
        let tree = new DeviceTree(UNKNOWN_HOST, PORT);
        tree.on("error", () => {
        });
        const expectedTimeoutInSec = 2;
        const initialTime = performance.now();
        return tree.connect(expectedTimeoutInSec)
            .then(() => {
                    throw new Error("Should have thrown");
                },
                error => {
                    const durationMs = performance.now() - initialTime;
                    const deltaMs = Math.abs(expectedTimeoutInSec * 1000 - durationMs);
                    expect(deltaMs).toBeLessThan(10);
                    expect(error.message).toBe(`Could not connect to ${UNKNOWN_HOST}:${PORT} after a timeout of ${expectedTimeoutInSec} seconds`)
                });
    });
});
