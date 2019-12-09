const expect = require("expect");
const TreeServer = require("../server");
const DeviceTree = require("../").DeviceTree;
const ember = require("../ember");
const {jsonRoot} = require("./utils");

const LOCALHOST = "127.0.0.1";
const PORT = 9009;

const wait = function(t) {
    return new Promise(resolve => {
        setTimeout(resolve, t);
    });
}

describe("server", function() {

    describe("JSONtoTree", function() {
        let jsonTree;
        beforeAll(function() {
            jsonTree = jsonRoot();
        });
        it("should generate an ember tree from json", function() {
            const root = TreeServer.JSONtoTree(jsonTree);
            expect(root).toBeDefined();
            expect(root.elements).toBeDefined();
            expect(root.elements.length).toBe(1);
            console.log("root", root.elements[0].contents);
            expect(root.elements[0].contents.identifier).toBe("scoreMaster");
            expect(root.elements[0].children.length).toBe(jsonTree[0].children.length);
        });
    });

    describe("Server - Client communication", function() {
        let server,client;
        beforeAll(function() {
            jsonTree = jsonRoot();
            const root = TreeServer.JSONtoTree(jsonTree);
            server = new TreeServer(LOCALHOST, PORT, root);
            server.on("error", e => {
                console.log(e);
            });
            server.on("clientError", e => {
                console.log(e);
            });
            //server._debug = true;
            return server.listen().then(() => {
                console.log("server listening");
            });
        });
        afterAll(function() {
            client.disconnect();
            server.close();
        })
        it("should receive and decode the full tree", function () {
            client = new DeviceTree(LOCALHOST, PORT);
            //client._debug = true;
            return Promise.resolve()
                .then(() => client.connect())
                .then(() => {
                    console.log("client connected");
                    return client.getDirectory();
                })
                .then(() => {
                    expect(client.root).toBeDefined();
                    expect(client.root.elements).toBeDefined();
                    expect(client.root.elements.length).toBe(1);
                    expect(client.root.elements[0].contents.identifier).toBe("scoreMaster");
                    return client.getDirectory(client.root.elements[0]);
                })
                .then(() => {
                    expect(client.root.elements[0].children.length).toBe(jsonTree[0].children.length);
                    return client.getDirectory(client.root.elements[0].children[0]);
                })
                .then(() => {
                    expect(client.root.elements[0].children[0].children.length).toBe(4);
                    expect(client.root.elements[0].children[0].children[3].contents.identifier).toBe("author");
                    // Issue #33 TreeServer.handleGetDirectory does not subscribe to child parameters
                    expect(server.subscribers["0.0.0"]).toBeDefined();
                    // Keepalive
	                return client.disconnect();
                });
        });
        it("should be able to modify a parameter", () => {
            client = new DeviceTree(LOCALHOST, PORT);
            //client._debug = true;
            return Promise.resolve()
                .then(() => client.connect())
                .then(() => {
                    return client.getDirectory();
                })
                .then(() => client.expand(client.root.elements[0]))
                .then(() => {
                    expect(server.tree.elements[0].children[0].children[1].contents.value).not.toBe("gdnet");
                    return client.setValue(client.root.elements[0].children[0].children[1], "gdnet");
                })
                .then(() => {
                    expect(server.tree.elements[0].children[0].children[1].contents.value).toBe("gdnet");          
                    return client.disconnect();
                });
        });
        
        it("should be able to call a function with parameters", () => {
            client = new DeviceTree(LOCALHOST, PORT);
            //client._debug = true;
            return Promise.resolve()
                .then(() => client.connect())
                .then(() => {
                    return client.getDirectory();
                })
                .then(() => client.expand(client.root.elements[0]))
                .then(() => {
                    const func = client.root.elements[0].children[2];
                    return client.invokeFunction(func, [
                        new ember.FunctionArgument(ember.ParameterType.integer, 1),
                        new ember.FunctionArgument(ember.ParameterType.integer, 7)
                    ]);
                })
                .then(result => {
                    console.log(result);
                    expect(result).toBeDefined();
                    expect(result.result).toBeDefined();
                    expect(result.result.length).toBe(1);
                    expect(result.result[0].value).toBe(8);
                    return client.disconnect();
                });
        });
        
        it("should be able to get child with getNodeByPath", function() {
            //server._debug = true;
            client = new DeviceTree(LOCALHOST, PORT);
            //client._debug = true;
            //client._debug = true;
            return Promise.resolve()
                .then(() => client.connect())
                .then(() => {
                    console.log("client connected");
                    return client.getDirectory();
                })
                .then(() => {
                    return new Promise((resolve, reject) => {
                        client.root.getNodeByPath(client.client, ["scoreMaster", "identity", "product"], (err, child) => {
                            if (err) { reject(err) }
                            else {
                                resolve(child);
                            }
                        });
                    });
                })
                .then(child => {
                console.log(child);
            })
            .then(() => {
                return new Promise((resolve, reject) => {
                    client.root.getNodeByPath(client.client, ["scoreMaster", "router", "labels"], (err, child) => {
                            if (err) { reject(err) }
                            else {
                                    resolve(child);
                            }
                    });
                });
            })
            .then(child => {
                console.log(child);
                client.disconnect();
            });
        });
	    it("should be able to get child with tree.getNodeByPath", function() {
            //server._debug = true;
            client = new DeviceTree(LOCALHOST, PORT);
            //client._debug = true;
            //client._debug = true;
            return Promise.resolve()
                .then(() => client.connect())
                .then(() => {
                    console.log("client connected");
                    return client.getDirectory();
                })
                .then(() =>  client.getNodeByPath("scoreMaster/identity/product"))
                .then(child => {
                    console.log(child);
                    return client.getNodeByPath("scoreMaster/router/labels/group 1");
                })
                .then(child => {
                    console.log("router/labels", child);
			        client.disconnect();
                });
        });
        it("should throw an error if getNodeByPath for unknown path", function() {
            //server._debug = true;
            client = new DeviceTree(LOCALHOST, PORT);
            return Promise.resolve()
                .then(() => client.connect())
                .then(() => {
                    console.log("client connected");
                    return client.getDirectory();
                })
                .then(() => client.getNodeByPath("scoreMaster/router/labels/group"))
                .then(child => {
                    console.log("router/labels", child);
                    throw new Error("Should not succeed");
                })
                .catch(e => {
                    client.disconnect();
                    console.log(e);
                    expect(e.message).toMatch(/Failed path discovery/);
                });
        });
        it("should be able to make a matrix connection", () => {
            client = new DeviceTree(LOCALHOST, PORT);
            //client._debug = true;
            return Promise.resolve()
                .then(() => client.connect())
                .then(() => {
                    return client.getDirectory();
                })
                .then(() => client.getNodeByPathnum("0.1.0"))
                .then(matrix => {
                    console.log(matrix);
                    client._debug = true;
                    server._debug = true;  
                    return client.matrixConnect(matrix, 0, [1]);
                })
                .then(matrix => client.getNodeByPathnum(matrix.getPath()))
                .then(matrix => {
                    console.log(matrix);
                    expect(matrix.connections['0'].sources).toBeDefined();
                    expect(matrix.connections['0'].sources.length).toBe(1);
                    expect(matrix.connections['0'].sources[0]).toBe(1);
                    return client.disconnect();
                });
        });
    });
});
