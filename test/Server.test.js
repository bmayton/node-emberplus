const expect = require("expect");
const EmberServer = require("../EmberServer");
const EmberClient = require("../EmberClient");
const ember = require("../EmberLib");
const {jsonRoot} = require("./utils");
const MatrixHandlers = require("../EmberServer/MatrixHandlers");

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
            const root = EmberServer.JSONtoTree(jsonTree);
            expect(root).toBeDefined();
            expect(root.elements).toBeDefined();
            expect(root.elements.size).toBe(1);
            console.log("root", root.getElementByNumber(0).contents);
            expect(root.getElementByNumber(0).contents.identifier).toBe("scoreMaster");
            expect(root.getElementByNumber(0).elements.size).toBe(jsonTree[0].children.length);
        });
    });

    describe("Server - Client communication", function() {
        let server,client;
        beforeAll(function() {
            jsonTree = jsonRoot();
            const root = EmberServer.JSONtoTree(jsonTree);
            server = new EmberServer(LOCALHOST, PORT, root);
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
            return server.close();
        });
        it("should receive and decode the full tree", function () {
            client = new EmberClient(LOCALHOST, PORT);
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
                    expect(client.root.elements.size).toBe(1);
                    expect(client.root.getElementByNumber(0).contents.identifier).toBe("scoreMaster");
                    return client.getDirectory(client.root.getElementByNumber(0));
                })
                .then(() => {
                    expect(client.root.getElementByNumber(0).elements.size).toBe(jsonTree[0].children.length);
                    return client.getDirectory(client.root.getElementByNumber(0).getElementByNumber(0));
                })
                .then(() => {
                    expect(client.root.getElementByNumber(0).getElementByNumber(0).elements.size).toBe(4);
                    expect(client.root.getElementByNumber(0).getElementByNumber(0).getElementByNumber(3).contents.identifier).toBe("author");
                    // Issue #33 EmberServer.handleGetDirectory does not subscribe to child parameters
                    expect(server.subscribers["0.0.0"]).toBeDefined();
                    // Keepalive
	                return client.disconnect();
                });
        });
        it("should be able to modify a parameter", () => {
            client = new EmberClient(LOCALHOST, PORT);
            //client._debug = true;
            return Promise.resolve()
                .then(() => client.connect())
                .then(() => {
                    return client.getDirectory();
                })
                .then(() => client.expand(client.root.getElementByNumber(0)))
                .then(() => {
                    expect(server.tree.getElementByNumber(0).getElementByNumber(0).getElementByNumber(1).contents.value).not.toBe("gdnet");
                    return client.setValue(client.root.getElementByNumber(0).getElementByNumber(0).getElementByNumber(1), "gdnet");
                })
                .then(() => {
                    expect(server.tree.getElementByNumber(0).getElementByNumber(0).getElementByNumber(1).contents.value).toBe("gdnet");          
                    return client.disconnect();
                });
        });
        
        it("should be able to call a function with parameters", () => {
            client = new EmberClient(LOCALHOST, PORT);
            //client._debug = true;
            return Promise.resolve()
                .then(() => client.connect())
                .then(() => {
                    return client.getDirectory();
                })
                .then(() => client.expand(client.root.getElementByNumber(0)))
                .then(() => {
                    const func = client.root.getElementByNumber(0).getElementByNumber(2);
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
        
	    it("should be able to get child with tree.getNodeByPath", function() {
            //server._debug = true;
            client = new EmberClient(LOCALHOST, PORT);
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
			        return client.disconnect();
                });
        });
        it("should throw an error if getNodeByPath for unknown path", function() {
            //server._debug = true;
            client = new EmberClient(LOCALHOST, PORT);
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
                    console.log(e);
                    expect(e.message).toMatch(/Failed path discovery/);
                    return client.disconnect();                    
                });
        });
        it("should be able to make a matrix connection", () => {
            client = new EmberClient(LOCALHOST, PORT);
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
    describe("Matrix Connect", function() {
        let jsonTree;
        let server;
        beforeEach(function() {
            jsonTree = jsonRoot();
            const root = EmberServer.JSONtoTree(jsonTree);
            server = new EmberServer(LOCALHOST, PORT, root);
        });
        it("should verify if connection allowed in 1-to-N", function() {
            let disconnectCount = 0;
            const handleDisconnect = info => {
                disconnectCount++;
            }
            server.on("matrix-disconnect", handleDisconnect.bind(this));
            const matrix = server.tree.getElementByNumber(0).getElementByNumber(1).getElementByNumber(0);
            let connection = new ember.MatrixConnection(0);
            connection.setSources([1]);
            connection.operation = ember.MatrixOperation.connect;
            let res = matrix.canConnect(connection.target,connection.sources,connection.operation);
            expect(res).toBeTruthy();
            matrix.setSources(0, [0]);
            res = matrix.canConnect(connection.target,connection.sources,connection.operation);
            expect(res).toBeFalsy();
            connection.operation = ember.MatrixOperation.absolute;
            res = matrix.canConnect(connection.target,connection.sources,connection.operation);
            expect(res).toBeTruthy();
            // We can't connect.  But server will disconnect existing source and connect new one.
            server._handlers.handleMatrixConnections(null, matrix, {0: connection});
            expect(matrix.connections[0].sources[0]).toBe(1);
            expect(disconnectCount).toBe(1);
            // But if connecting same source and dest this is a disconnect.  But not possible in 1toN.
            // instead connect with defaultSource or do nothing
            const matrixHandlers = new MatrixHandlers(server);
            matrixHandlers.getDisconnectSource(matrix, 0);
            matrix.defaultSources[0].contents.value = 222;
            server._handlers.handleMatrixConnections(null, matrix, {0: connection});
            expect(disconnectCount).toBe(2);
            expect(matrix.connections[0].sources[0]).toBe(222);
            matrix.setSources(0, [0]);
            connection = new ember.MatrixConnection(1);
            connection.operation = ember.MatrixOperation.absolute;
            connection.setSources([1]);
            res = matrix.canConnect(connection.target,connection.sources,connection.operation);
            expect(res).toBeTruthy();
        });
        it("should verify if connection allowed in 1-to-1", function() {
            const matrix = server.tree.getElementByNumber(0).getElementByNumber(1).getElementByNumber(0);
            let disconnectCount = 0;
            const handleDisconnect = info => {
                disconnectCount++;
            }
            server.on("matrix-disconnect", handleDisconnect.bind(this));
            matrix.contents.type = ember.MatrixType.oneToOne;
            const connection = new ember.MatrixConnection(0);
            connection.setSources([1]);
            connection.operation = ember.MatrixOperation.connect;
            let res = matrix.canConnect(connection.target,connection.sources,connection.operation);
            expect(res).toBeTruthy();
            matrix.setSources(0, [0]);
            res = matrix.canConnect(connection.target,connection.sources,connection.operation);
            expect(res).toBeFalsy();
            // We can't connect but in 1-on-1 server should disconnect existing source and connect new one.
            server._handlers.handleMatrixConnections(null, matrix, {0: connection});
            expect(matrix.connections[0].sources[0]).toBe(1);
            expect(disconnectCount).toBe(1);
            // But if connecting same source and dest.  just disconnect and do not reconnect.
            server._handlers.handleMatrixConnections(null, matrix, {0: connection});
            expect(disconnectCount).toBe(2);
            connection.operation = ember.MatrixOperation.absolute;
            res = matrix.canConnect(connection.target,connection.sources,connection.operation);
            expect(res).toBeTruthy();
            matrix.setSources(0, []);
            matrix.setSources(1, [1]);
            res = matrix.canConnect(connection.target,connection.sources,connection.operation);
            expect(res).toBeFalsy();
            server.off("matrix-disconnect", handleDisconnect);
        });
        it("should disconnect if trying to connect same source and target in 1-to-1", function() {
            const matrix = server.tree.getElementByNumber(0).getElementByNumber(1).getElementByNumber(0);
            let disconnectCount = 0;
            const handleDisconnect = info => {
                disconnectCount++;
            }
            server.on("matrix-disconnect", handleDisconnect.bind(this));
            matrix.contents.type = ember.MatrixType.oneToOne;
            matrix.setSources(0, [1]);
            const connection = new ember.MatrixConnection(0);
            connection.setSources([1]);
            connection.operation = ember.MatrixOperation.connect;
            server._handlers.handleMatrixConnections(null, matrix, {0: connection});
            expect(matrix.connections[0].sources.length).toBe(0);
            expect(disconnectCount).toBe(1);
        });
        it("should be able to lock a connection", function() {
            const matrix = server.tree.getElementByNumber(0).getElementByNumber(1).getElementByNumber(0);
            let disconnectCount = 0;
            const handleDisconnect = info => {
                disconnectCount++;
            }
            server.on("matrix-disconnect", handleDisconnect.bind(this));
            matrix.contents.type = ember.MatrixType.oneToOne;
            matrix.setSources(0, [1]);
            matrix.connections[0].lock();
            const connection = new ember.MatrixConnection(0);
            connection.setSources([0]);
            connection.operation = ember.MatrixOperation.connect;
            server._handlers.handleMatrixConnections(null, matrix, {0: connection});
            expect(matrix.connections[0].sources.length).toBe(1);
            expect(matrix.connections[0].sources[0]).toBe(1);
            expect(disconnectCount).toBe(0);
        });
        it("should verify if connection allowed in N-to-N", function() {
            const matrix = server.tree.getElementByNumber(0).getElementByNumber(1).getElementByNumber(0);
            matrix.contents.type = ember.MatrixType.nToN;
            matrix.contents.maximumTotalConnects = 2;
            matrix.setSources(0, [0,1]);

            const connection = new ember.MatrixConnection(0);
            connection.setSources([2]);
            connection.operation = ember.MatrixOperation.connect;
            let res = matrix.canConnect(connection.target,connection.sources,connection.operation);
            expect(res).toBeFalsy();

            matrix.setSources(2, [2]);
            matrix.setSources(1, [1]);
            matrix.setSources(0, []);
            res = matrix.canConnect(connection.target,connection.sources,connection.operation);
            expect(res).toBeFalsy();

            matrix.setSources(1, []);
            res = matrix.canConnect(connection.target,connection.sources,connection.operation);
            expect(res).toBeTruthy();

            matrix.setSources(0, [1,2]);
            matrix.setSources(1, []);
            connection.operation = ember.MatrixOperation.absolute;
            res = matrix.canConnect(connection.target,connection.sources,connection.operation);
            expect(res).toBeTruthy();


            matrix.contents.maximumTotalConnects = 20;
            matrix.contents.maximumConnectsPerTarget = 1;

            matrix.setSources(2, [2]);
            matrix.setSources(1, [1]);
            matrix.setSources(0, [0]);
            connection.setSources([2]);
            connection.operation = ember.MatrixOperation.connect;

            res = matrix.canConnect(connection.target,connection.sources,connection.operation);
            expect(res).toBeFalsy();

            matrix.setSources(0, []);
            res = matrix.canConnect(connection.target,connection.sources,connection.operation);
            expect(res).toBeTruthy();

            matrix.setSources(0, [0]);
            connection.operation = ember.MatrixOperation.absolute;
            res = matrix.canConnect(connection.target,connection.sources,connection.operation);
            expect(res).toBeTruthy();

        });
        it("should return modified answer on absolute connect", function() {
            let client;
            server.on("error", e => {
                console.log(e);
            });
            server.on("clientError", e => {
                console.log(e);
            });
            //server._debug = true;
            return server.listen()
                .then(() => {
                    client = new EmberClient(LOCALHOST, PORT);
                    return Promise.resolve()
                })
                .then(() => client.connect())
                .then(() => client.getDirectory())
                .then(() => client.getNodeByPathnum("0.1.0"))
                .then(matrix => {
                    console.log(matrix);
                    return client.matrixSetConnection(matrix, 0, [1]);
                })
                .then(result => {
                    console.log(result);
                    expect(result).toBeDefined();
                    expect(result.connections).toBeDefined();
                    expect(result.connections[0]).toBeDefined();
                    expect(result.connections[0].disposition).toBe(ember.MatrixDisposition.modified);
                    return client.disconnect();
                })
                .then(() => {
                    console.log("closing server");
                    server.close();
                });
        });
    });
    describe("Parameters subscribe/unsubscribe", function( ){
        let jsonTree;
        let server;
        beforeAll(function() {
            jsonTree = jsonRoot();
            const root = EmberServer.JSONtoTree(jsonTree);
            server = new EmberServer(LOCALHOST, PORT, root);
            server.on("error", e => {
                console.log(e);
            });
            server.on("clientError", e => {
                console.log(e);
            });
            return server.listen();
        });
        afterAll(function() {
            return server.close();
        });
        it("should not auto subscribe stream parameter", function() {
            const parameter = server.tree.getElementByNumber(0).getElementByNumber(0).getElementByNumber(2);
            console.log(parameter);
            expect(parameter.isStream()).toBeTruthy();
            expect(server.subscribers["0.0.2"]).not.toBeDefined();
        });
        it("should be able subscribe to parameter changes", function() {
            const client = new EmberClient(LOCALHOST, PORT);
            const cb = () => {
                return "updated";
            }
            //client._debug = true;
            return Promise.resolve()
                .then(() => client.connect())
                .then(() => {
                    return client.getDirectory();
                })
                .then(() => client.getNodeByPathnum("0.0.2"))
                .then(parameter => {
                    console.log(parameter);
                    expect(server.subscribers["0.0.2"]).not.toBeDefined();
                    expect(parameter.contents._subscribers).toBeDefined();
                    expect(parameter.contents._subscribers.size).toBe(0);
                    server._subscribe = server.subscribe;
                    let _resolve;
                    const p = new Promise((resolve, reject) => {
                        _resolve = resolve;
                    });
                    server.subscribe = (c,e) => {
                        server._subscribe(c,e);
                        _resolve();
                    };
                    return client.subscribe(parameter, cb).then(() => (p))
                })
                .then(() => {                    
                    expect(server.subscribers["0.0.2"]).toBeDefined();
                    expect(server.subscribers["0.0.2"].size).toBe(1);
                    return client.getNodeByPathnum("0.0.2");
                })
                .then(parameter => {                    
                    expect(parameter.contents._subscribers).toBeDefined();
                    expect(parameter.contents._subscribers.size).toBe(1);
                    server._unsubscribe = server.unsubscribe;
                    let _resolve;
                    const p = new Promise((resolve, reject) => {
                        _resolve = resolve;
                    });
                    server.unsubscribe = (c,e) => {
                        console.log("unsubscribe");
                        server._unsubscribe(c,e);
                        _resolve();
                    };
                    console.log(parameter);
                    return client.unsubscribe(parameter, cb).then(() => (p))
                })
                .then(() => {       
                    console.log(server.subscribers);             
                    expect(server.subscribers["0.0.2"]).toBeDefined();
                    return client.getNodeByPathnum("0.0.2");
                })
                .then(parameter => {
                    console.log(parameter);
                    expect(server.subscribers["0.0.2"]).toBeDefined();
                    expect(server.subscribers["0.0.2"].size).toBe(0);
                    expect(parameter.contents._subscribers).toBeDefined();
                    expect(parameter.contents._subscribers.size).toBe(0);
                })
                .then(() => client.disconnect());
        });
    });
});
