const expect = require("expect");
const {EmberServer, ServerEvents} = require("../EmberServer");
const EmberClient = require("../EmberClient");
const EmberLib = require("../EmberLib");
const {jsonRoot} = require("./utils");
const MatrixHandlers = require("../EmberServer/MatrixHandlers");
const Errors = require("../Errors");

const LOCALHOST = "127.0.0.1";
let PORT = 9009;

describe("server", function() {
    describe("JSONtoTree", function() {
        let jsonTree;
        beforeEach(function() {
            jsonTree = jsonRoot();
        });
        it("should generate an ember tree from json", function() {
            const root = EmberServer.JSONtoTree(jsonTree);
            // JSONtoTree will modify the json object.
            jsonTree = jsonRoot();
            expect(root).toBeDefined();
            expect(root.elements).toBeDefined();
            expect(root.elements.size).toBe(jsonTree.length);
            expect(root.getElementByNumber(0).contents.identifier).toBe("scoreMaster");
            expect(root.getElementByNumber(0).elements.size).toBe(jsonTree[0].children.length);
            expect(root.getElementByNumber(1).contents.streamDescriptor instanceof EmberLib.StreamDescription).toBeTruthy();
            expect(root.getElementByNumber(1).contents.streamDescriptor.offset).toBe(jsonTree[1].streamDescriptor.offset);
        });
        it("should throw an error if invalid matrix mode", function() {
            jsonTree[0].children[1].children[0].mode = "invalid";
            let error;
            try {
                const root = EmberServer.JSONtoTree(jsonTree);
            }
            catch(e) {
                error = e;
            }
            expect(error).toBeDefined();
            expect(error instanceof Errors.InvalidEmberNode).toBeDefined();
        });
        it("should support matrix type nToN nonLinear", function() {
            jsonTree[0].children[1].children[0].type = "nToN";
            jsonTree[0].children[1].children[0].mode = "nonLinear";
            jsonTree[0].children[1].children[0].maximumConnectsPerTarget = 10;
            jsonTree[0].children[1].children[0].maximumTotalConnects = 100;
            const root = EmberServer.JSONtoTree(jsonTree);
            const matrix = root.getElementByPath("0.1.0");            
            expect(matrix).toBeDefined();
            expect(matrix.contents.maximumConnectsPerTarget).toBe(jsonTree[0].children[1].children[0].maximumConnectsPerTarget);
            expect(matrix.contents.maximumTotalConnects).toBe(jsonTree[0].children[1].children[0].maximumTotalConnects);
            expect(matrix.contents.type).toBe(EmberLib.MatrixType.nToN);
            const jMatrix = matrix.toJSON();
            expect(jMatrix.type).toBeDefined();
            expect(jMatrix.mode).toBeDefined();
        });
        it("should support matrix type oneToOne", function() {
            jsonTree[0].children[1].children[0].type = "oneToOne";
            const root = EmberServer.JSONtoTree(jsonTree);
            const matrix = root.getElementByPath("0.1.0");            
            expect(matrix).toBeDefined();
            expect(matrix.contents.type).toBe(EmberLib.MatrixType.oneToOne);
        });
        it("should throw an error if invalid matrix type", function() {
            jsonTree[0].children[1].children[0].type = "invalid";
            let error;
            try {
                const root = EmberServer.JSONtoTree(jsonTree);
            }
            catch(e) {
                error = e;
            }
            expect(error).toBeDefined();
            expect(error instanceof Errors.InvalidEmberNode).toBeDefined();
        });
        it("should generate a matrix with a valid toJSON", function() {
            const root = EmberServer.JSONtoTree(jsonTree);
            const matrix = root.getElementByPath("0.1.0");
            matrix.connectSources(0, [0]);
            matrix.connectSources(1, [1]);
            const jMatrix = matrix.toJSON();
            expect(jMatrix.type).toBeDefined();
            expect(jMatrix.type).toBe(matrix.contents.type.value);
            expect(jMatrix.mode).toBeDefined();
            expect(jMatrix.mode).toBe(matrix.contents.mode.value);
            expect(jMatrix.connections[0].sources.length).toBe(1);
            expect(jMatrix.connections[0].sources[0]).toBe(0);
        });
    });

    describe("Server - Client communication", function() {
        let server,client,jsonTree;
        beforeEach(() => {
            jsonTree = jsonRoot();
            const root = EmberServer.JSONtoTree(jsonTree);
            server = new EmberServer(LOCALHOST, PORT, root);
            server.on("error", e => {
                // ignore
            });
            server.on("clientError", e => {
                // ignore
            });
            //server._debug = true;
            return server.listen();
        });
        afterEach(() => {
            return server.close();
        });
        it("should receive and decode the full tree", () => {
            client = new EmberClient(LOCALHOST, PORT);
            //client._debug = true;
            return Promise.resolve()
                .then(() => client.connect())
                .then(() => client.getDirectory())
                .then(() => {
                    expect(client.root).toBeDefined();
                    expect(client.root.elements).toBeDefined();
                    expect(client.root.elements.size).toBe(jsonTree.length);
                    expect(client.root.getElementByNumber(0).contents.identifier).toBe("scoreMaster");
                    return client.getDirectory(client.root.getElementByNumber(0));
                })
                .then(() => {
                    expect(client.root.getElementByNumber(0).elements.size).toBe(jsonTree[0].children.length);
                    return client.getDirectory(client.root.getElementByPath("0.0"));
                })
                .then(() => {
                    expect(client.root.getElementByPath("0.0").elements.size).toBe(4);
                    expect(client.root.getElementByPath("0.0.3").contents.identifier).toBe("author");
                    // Issue #33 EmberServer.handleGetDirectory does not subscribe to child parameters
                    expect(server.subscribers["0.0.0"]).toBeDefined();
                    return client.disconnect();
                });
        });
        it("should be able to modify a parameter", async () => {
            client = new EmberClient(LOCALHOST, PORT);
            await client.connect()
            await client.getDirectory();
            await client.getElementByPath("0.0.1");
            expect(server.tree.getElementByPath("0.0.1").contents.value).not.toBe("gdnet");
            await client.setValue(client.root.getElementByPath("0.0.1"), "gdnet");                 
            expect(server.tree.getElementByPath("0.0.1").contents.value).toBe("gdnet");
            console.log("result", server.tree.getElementByPath("0.0.1").contents.value)
            return client.disconnect().then(() => { console.log("disconnected")});
        });
        
        it("should be able to call a function with parameters", () => {
            client = new EmberClient(LOCALHOST, PORT);
            //client._debug = true;
            return client.connect()
                .then(() => client.getDirectory())
                .then(() => client.getElementByPath("0.2"))
                .then(() => {
                    const func = client.root.getElementByPath("0.2");
                    return client.invokeFunction(func, [
                        new EmberLib.FunctionArgument(EmberLib.ParameterType.integer, 1),
                        new EmberLib.FunctionArgument(EmberLib.ParameterType.integer, 7)
                    ]);
                })
                .then(result => {
                    expect(result).toBeDefined();
                    expect(result.result).toBeDefined();
                    expect(result.result.length).toBe(1);
                    expect(result.result[0].value).toBe(8);
                    return client.disconnect();
                });
        });
        
        it("should be able to get child with client.getElement", function() {
            client = new EmberClient(LOCALHOST, PORT);
            return Promise.resolve()
                .then(() => client.connect())
                .then(() => client.getDirectory())
                .then(() =>  client.getElementByPath("scoreMaster/identity/product"))
                .then(() => client.getElementByPath("scoreMaster/router/labels/group 1"))
                .then(() => client.disconnect());
        });
        it("should be able to get child with getElementByPath", function() {
            client = new EmberClient(LOCALHOST, PORT);
            return Promise.resolve()
                .then(() => client.connect())
                .then(() => client.getDirectory())
                .then(() =>  client.getElementByPath("scoreMaster/identity/product"))
                .then(() => client.getElementByPath("scoreMaster/router/labels/group 1"))
                .then(() => client.disconnect());
        });
        it("should throw an error if getElementByPath for unknown path", function() {
            client = new EmberClient(LOCALHOST, PORT);
            return Promise.resolve()
                .then(() => client.connect())
                .then(() => client.getDirectory())
                .then(() => client.getElementByPath("scoreMaster/router/labels/group"))
                .then(() => {
                    throw new Error("Should not succeed");
                })
                .catch(e => {
                    expect(e.message).toMatch(/Failed path discovery/);
                    return client.disconnect();                    
                });
        });
        it("should be able to make a matrix connection", () => {
            client = new EmberClient(LOCALHOST, PORT);
            return Promise.resolve()
                .then(() => client.connect())
                .then(() => client.getDirectory())
                .then(() => client.getElementByPath("0.1.0"))
                .then(matrix => client.matrixConnect(matrix, 0, [1]))
                .then(matrix => client.getElementByPath(matrix.getPath()))
                .then(matrix => {
                    expect(matrix.connections['0'].sources).toBeDefined();
                    expect(matrix.connections['0'].sources.length).toBe(1);
                    expect(matrix.connections['0'].sources[0]).toBe(1);                    
                })
                .then(() => client.disconnect());
        });
        it("should generate events on command and matrix connection", () => {
            client = new EmberClient(LOCALHOST, PORT);
            let count = 0;
            let receivedEvent = null;
            const eventHandler = event => {
                count++;
                receivedEvent = event;
            }
            return Promise.resolve()
                .then(() => client.connect())
                .then(() => {
                    count = 0;
                    server.on("event", eventHandler);
                    return client.getDirectory();
                })
                .then(() => {
                    expect(count).toBe(1);
                    expect(receivedEvent.type).toBe(ServerEvents.Types.GETDIRECTORY);
                    return client.getElementByPath("0.1.0");
                })
                .then(matrix => {
                    count = 0;                    
                    return client.matrixConnect(matrix, 0, [1]);
                })
                .then(() => {
                    expect(count).toBe(1);
                    expect(receivedEvent.type).toBe(ServerEvents.Types.MATRIX_CONNECTION);
                })
                .then(() => {
                    count = 0;
                    const func = client.root.getElementByPath("0.2");
                    return client.invokeFunction(func, [
                        new EmberLib.FunctionArgument(EmberLib.ParameterType.integer, 1),
                        new EmberLib.FunctionArgument(EmberLib.ParameterType.integer, 7)
                    ]);
                })
                .then(() => {
                    expect(count).toBe(1);
                    expect(receivedEvent.type).toBe(ServerEvents.Types.INVOKE);
                })
                .then(() => client.getElementByPath("0.0.2"))
                .then(parameter => {
                    server._subscribe = server.subscribe;
                    let _resolve;
                    const p = new Promise((resolve) => {
                        _resolve = resolve;
                    });
                    server.subscribe = (c,e) => {
                        server._subscribe(c,e);
                        _resolve();
                    };
                    count = 0;
                    return client.subscribe(parameter).then(() => (p))
                })
                .then(() => {
                    expect(count).toBe(1);
                    expect(receivedEvent.type).toBe(ServerEvents.Types.SUBSCRIBE);
                })
                .then(() => {
                    server.off("event", eventHandler);
                })
                .then(() => client.disconnect());
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
        afterEach(() => {
            return server.close();
        });
        it("should verify if connection allowed in 1-to-N", function() {
            let disconnectCount = 0;
            const handleDisconnect = () => {
                disconnectCount++;
            }
            server.on("matrix-disconnect", handleDisconnect.bind(this));
            const matrix = server.tree.getElementByPath("0.1.0");
            let connection = new EmberLib.MatrixConnection(0);
            connection.setSources([1]);
            connection.operation = EmberLib.MatrixOperation.connect;
            let res = matrix.canConnect(connection.target,connection.sources,connection.operation);
            expect(res).toBeTruthy();
            matrix.setSources(0, [0]);
            res = matrix.canConnect(connection.target,connection.sources,connection.operation);
            expect(res).toBeFalsy();
            connection.operation = EmberLib.MatrixOperation.absolute;
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
            connection = new EmberLib.MatrixConnection(1);
            connection.operation = EmberLib.MatrixOperation.absolute;
            connection.setSources([1]);
            res = matrix.canConnect(connection.target,connection.sources,connection.operation);
            expect(res).toBeTruthy();
        });
        it("should verify if connection allowed in 1-to-1", function() {
            const matrix = server.tree.getElementByPath("0.1.0");
            let disconnectCount = 0;
            const handleDisconnect = () => {
                disconnectCount++;
            }
            server.on("matrix-disconnect", handleDisconnect.bind(this));
            matrix.contents.type = EmberLib.MatrixType.oneToOne;
            const connection = new EmberLib.MatrixConnection(0);
            connection.setSources([1]);
            connection.operation = EmberLib.MatrixOperation.connect;
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
            connection.operation = EmberLib.MatrixOperation.absolute;
            res = matrix.canConnect(connection.target,connection.sources,connection.operation);
            expect(res).toBeTruthy();
            matrix.setSources(0, []);
            matrix.setSources(1, [1]);
            res = matrix.canConnect(connection.target,connection.sources,connection.operation);
            expect(res).toBeFalsy();
            server.off("matrix-disconnect", handleDisconnect);
        });
        it("should disconnect if trying to connect same source and target in 1-to-1", function() {
            const matrix = server.tree.getElementByPath("0.1.0");
            let disconnectCount = 0;
            const handleDisconnect = () => {
                disconnectCount++;
            }
            server.on("matrix-disconnect", handleDisconnect.bind(this));
            matrix.contents.type = EmberLib.MatrixType.oneToOne;
            matrix.setSources(0, [1]);
            const connection = new EmberLib.MatrixConnection(0);
            connection.setSources([1]);
            connection.operation = EmberLib.MatrixOperation.connect;
            server._handlers.handleMatrixConnections(null, matrix, {0: connection});
            expect(matrix.connections[0].sources.length).toBe(0);
            expect(disconnectCount).toBe(1);
        });
        it("should be able to lock a connection", function() {
            const matrix = server.tree.getElementByPath("0.1.0");
            let disconnectCount = 0;
            const handleDisconnect = () => {
                disconnectCount++;
            }
            server.on("matrix-disconnect", handleDisconnect.bind(this));
            matrix.contents.type = EmberLib.MatrixType.oneToOne;
            matrix.setSources(0, [1]);
            matrix.connections[0].lock();
            const connection = new EmberLib.MatrixConnection(0);
            connection.setSources([0]);
            connection.operation = EmberLib.MatrixOperation.connect;
            server._handlers.handleMatrixConnections(null, matrix, {0: connection});
            expect(matrix.connections[0].sources.length).toBe(1);
            expect(matrix.connections[0].sources[0]).toBe(1);
            expect(disconnectCount).toBe(0);
        });
        it("should verify if connection allowed in N-to-N", function() {
            const matrix = server.tree.getElementByPath("0.1.0");
            matrix.contents.type = EmberLib.MatrixType.nToN;
            matrix.contents.maximumTotalConnects = 2;
            matrix.setSources(0, [0,1]);

            const connection = new EmberLib.MatrixConnection(0);
            connection.setSources([2]);
            connection.operation = EmberLib.MatrixOperation.connect;
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
            connection.operation = EmberLib.MatrixOperation.absolute;
            res = matrix.canConnect(connection.target,connection.sources,connection.operation);
            expect(res).toBeTruthy();


            matrix.contents.maximumTotalConnects = 20;
            matrix.contents.maximumConnectsPerTarget = 1;

            matrix.setSources(2, [2]);
            matrix.setSources(1, [1]);
            matrix.setSources(0, [0]);
            connection.setSources([2]);
            connection.operation = EmberLib.MatrixOperation.connect;

            res = matrix.canConnect(connection.target,connection.sources,connection.operation);
            expect(res).toBeFalsy();

            matrix.setSources(0, []);
            res = matrix.canConnect(connection.target,connection.sources,connection.operation);
            expect(res).toBeTruthy();

            matrix.setSources(0, [0]);
            connection.operation = EmberLib.MatrixOperation.absolute;
            res = matrix.canConnect(connection.target,connection.sources,connection.operation);
            expect(res).toBeTruthy();

        });
        it("should return modified answer on absolute connect", function() {
            let client;
            server.on("error", () => {
                // ignore
            });
            server.on("clientError", () => {
                // ignore
            });
            //server._debug = true;
            return server.listen()
                .then(() => {
                    client = new EmberClient(LOCALHOST, PORT);
                    return Promise.resolve()
                })
                .then(() => client.connect())
                .then(() => client.getDirectory())
                .then(() => client.getElementByPath("0.1.0"))
                .then(matrix => client.matrixSetConnection(matrix, 0, [1]))
                .then(result => {
                    expect(result).toBeDefined();
                    expect(result.connections).toBeDefined();
                    expect(result.connections[0]).toBeDefined();
                    expect(result.connections[0].disposition).toBe(EmberLib.MatrixDisposition.modified);
                    return client.disconnect();
                });
        });
    });
    describe("Parameters subscribe/unsubscribe", function( ){
        let jsonTree;
        let server;
        beforeEach(function() {
            jsonTree = jsonRoot();
            const root = EmberServer.JSONtoTree(jsonTree);
            server = new EmberServer(LOCALHOST, PORT, root);
            server.on("error", () => {
                // ignore
            });
            server.on("clientError", () => {
                // ignore
            });
            return server.listen();
        });
        afterEach(function() {
            return server.close();
        });
        it("should not auto subscribe stream parameter", function() {
            const parameter = server.tree.getElementByPath("0.0.2");
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
                .then(() => client.getElementByPath("0.0.2"))
                .then(parameter => {
                    expect(server.subscribers["0.0.2"]).not.toBeDefined();
                    expect(parameter._subscribers).toBeDefined();
                    expect(parameter._subscribers.size).toBe(0);
                    server._subscribe = server.subscribe;
                    let _resolve;
                    const p = new Promise(resolve => {
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
                    return client.getElementByPath("0.0.2");
                })
                .then(parameter => {                    
                    expect(parameter._subscribers).toBeDefined();
                    expect(parameter._subscribers.size).toBe(1);
                    server._unsubscribe = server.unsubscribe;
                    let _resolve;
                    const p = new Promise(resolve => {
                        _resolve = resolve;
                    });
                    server.unsubscribe = (c,e) => {
                        server._unsubscribe(c,e);
                        _resolve();
                    };
                    return client.unsubscribe(parameter, cb).then(() => (p))
                })
                .then(() => {       
                    expect(server.subscribers["0.0.2"]).toBeDefined();
                    return client.getElementByPath("0.0.2");
                })
                .then(parameter => {
                    expect(server.subscribers["0.0.2"]).toBeDefined();
                    expect(server.subscribers["0.0.2"].size).toBe(0);
                    expect(parameter._subscribers).toBeDefined();
                    expect(parameter._subscribers.size).toBe(0);
                })
                .then(() => client.disconnect());
        });
    });
    describe("Handlers", () => {
        let jsonTree;
        let server;
        beforeEach(function() {
            jsonTree = jsonRoot();
            const root = EmberServer.JSONtoTree(jsonTree);
            server = new EmberServer(LOCALHOST, PORT, root);
            server.on("error", () => {
                //ignore
            });
            server.on("clientError", () => {
                //ignore
            });
            return server.listen();
        });
        afterEach(function() {
            return server.close();
        });
        it("Should through an error if can't process request", () => {
            const root = new EmberLib.Root();
            root.addElement(new EmberLib.Node(0));
            let error;
            const errorHandler = function(e) {
                error = e;
            }
            server.on("error", errorHandler);
            const client = new EmberClient(LOCALHOST, PORT);
            return client.connect()
            .then(() => {
                server.handleRoot(client._client, root);
                expect(error instanceof Errors.InvalidRequesrFormat);
                client.disconnect();
            });
        });
        it("should ignore empty or null tree", () => {
            const root = new EmberLib.Root();
            let error;
            try {
                server.handleRoot(null, root);
            }
            catch(e) {
                error = e;
            }
            expect(error).not.toBeDefined();
        });
        it("should generate responses which include children", () => {
            const node = server.tree.getElementByNumber(0);
            server.getResponse(node);
            expect(node.getChildren().length > 0).toBeTruthy();
        });
        it("Should update parameter value if new parameter value received", () => {
            const root = new EmberLib.Root();
            const parameter = new EmberLib.Parameter(2);
            const VALUE = "3.4.5";
            parameter.contents = new EmberLib.ParameterContents(VALUE, "string");
            root.addElement(new EmberLib.Node(0));
            root.getElement(0).addChild(new EmberLib.Node(0));
            root.getElementByPath("0.0").addChild(parameter);
            const client = new EmberClient(LOCALHOST, PORT);
            return client.connect()
            .then(() => {
                server.handleRoot(client._client, root);
                const res = server.tree.getElementByPath("0.0.2");
                expect(res.contents.value).toBe(VALUE);
                return client.disconnect();
            });
        });
        it("Should throw an error if element not found during request process", () => {
            const root = new EmberLib.Root();
            const parameter = new EmberLib.Parameter(99);
            const VALUE = "3.4.5";
            parameter.contents = new EmberLib.ParameterContents(VALUE, "string");
            root.addElement(new EmberLib.Node(0));
            root.getElement(0).addChild(new EmberLib.Node(0));
            root.getElementByPath("0.0").addChild(parameter);
            const client = new EmberClient(LOCALHOST, PORT);
            return client.connect()
            .then(() => {
                let count = 0;
                server.handleError = () => {
                    count++;
                }
                server.handleRoot(client._client, root);
                expect(count).toBe(1);
                return client.disconnect();
            });
        });
        it("Should throw an error if element contains null child", () => {
            const root = new EmberLib.Root();
            const node = new EmberLib.Node(0);
            root.addElement(node);
            node.elements = new Map();
            node.elements.set(0, null);
            const client = new EmberClient(LOCALHOST, PORT);
            return client.connect()
            .then(() => {
                let count = 0;
                server.handleError = () => {
                    count++;
                }
                server.handleRoot(client._client, root);
                expect(count).toBe(1);
                return client.disconnect();
            });
        });
        it("should handle commands embedded in Node", () => {
            const root = new EmberLib.Root();
            const node = new EmberLib.Node(0);
            root.addElement(node);
            node.elements = new Map();
            node.elements.set(EmberLib.COMMAND_GETDIRECTORYGETDIRECTORY, new EmberLib.Command(EmberLib.COMMAND_GETDIRECTORYGETDIRECTORY));
            const client = new EmberClient(LOCALHOST, PORT);
            return client.connect()
            .then(() => {
                let count = 0;
                server._handlers.handleCommand = () => {
                    count++;
                }
                server.handleRoot(client._client, root);
                expect(count).toBe(1);
                return client.disconnect();
            });
        });
        it("should catch unknown commands", () => {
            const command = new EmberLib.Command(99);
            let count = 0;
            server.on("error", e => {
                expect(e instanceof Errors.InvalidCommand);
                count++;                    
            });
            server._handlers.handleCommand(null, new EmberLib.Root(), command);
            expect(count).toBe(1);
        });
        it("should catch invalid node with no number", () => {
            const node = new EmberLib.Node(99);
            node.number = null;
            let count = 0;
            server.on("error", e => {
                expect(e instanceof Errors.MissingElementNumber);
                count++;                    
            });
            server._handlers.handleNode(null, node);
            expect(count).toBe(1);
        });
        it("should handle matrix connections embedded in Node", () => {
            const root = new EmberLib.Root();
            const node = new EmberLib.Node(0);
            root.addElement(node);
            const matrix = new EmberLib.MatrixNode(0);
            matrix.connections = [
                new EmberLib.MatrixConnection(0)
            ];
            node.elements = new Map();
            node.elements.set(0, matrix);
            const client = new EmberClient(LOCALHOST, PORT);
            return client.connect()
            .then(() => {
                let count = 0;
                server._handlers.handleMatrixConnections = () => {
                    count++;
                }
                server.handleRoot(client._client, root);
                expect(count).toBe(1);
                return client.disconnect();
            });
        });
        it("should catch function invocation errors and set success to false", () => {            
            const client = new EmberClient(LOCALHOST, PORT);
            return client.connect()
            .then(() => {
                const root = new EmberLib.Root();
                const func = new EmberLib.Function(0, () => { throw Error("function error")});
                root.addElement(func);
                server.tree = root;
                return client.invokeFunction(func, []);
            })
            .then(result => {
                expect(result).toBeDefined();
                expect(result.success).toBeFalsy();
            })
            .then(() => client.disconnect());
        });
        it("should catch invoke to non function", () => {            
            const client = new EmberClient(LOCALHOST, PORT);
            let result;
            client.sendBERNode = function(res) {
                result = res;
            }
            const root = new EmberLib.Root();
            const func = new EmberLib.Node(0);
            root.addElement(func);
            server.tree = root;
            const command = EmberLib.Command.getInvocationCommand(new EmberLib.Invocation(1, []));
            server._handlers.handleInvoke(client, func, command);
            expect(result).toBeDefined();
            expect(result.success).toBeFalsy();
            return client.disconnect();
        });
    });
    describe("Matrix", () => {
        let jsonTree;
        const MATRIX_PATH = "0.1.0";
        /** @type {EmberServer} */
        let server;
        beforeEach(function() {
            jsonTree = jsonRoot();
            const root = EmberServer.JSONtoTree(jsonTree);
            server = new EmberServer(LOCALHOST, PORT, root);
            server.on("error", () => {
                //ignore
            });
            server.on("clientError", () => {
                //ignore
            });
            return server.listen();
        });
        afterEach(function() {
            return server.close();
        });
        it("should generate connections structure if none provided when calling JSONtoStree", () => {
            const js = jsonRoot();
            js[0].children[1].children[0].connections = null;
            const tree = EmberServer.JSONtoTree(js);
            const matrix = tree.getElementByPath(MATRIX_PATH);
            expect(matrix.connections).toBeDefined();
            for(let i = 0; i < matrix.contents.targetCount; i++) {
                expect(matrix.connections[i]).toBeDefined();
                expect(matrix.connections[i].target).toBe(i);
            }
        });
        it("should have a matrixConnect function", () => {
            const matrix = server.tree.getElementByPath(MATRIX_PATH);
            matrix.connections[0].setSources([]);
            server.matrixConnect(MATRIX_PATH, 0, [1]);
            expect(matrix.connections[0].sources).toBeDefined();
            expect(matrix.connections[0].sources.length).toBe(1);
            expect(matrix.connections[0].sources[0]).toBe(1);
        });
        it("should throw an error if can't find matrix", () => {
            try {
                server.matrixConnect("0.99.0", 0, [1]);
                throw new Error("Should not succeed");
            }
            catch(error) {
                expect(error instanceof Errors.UnknownElement);
            }
        });
        it("should throw an error if invalid matrix", () => {
            const matrix = server.tree.getElementByPath(MATRIX_PATH);
            matrix.contents = null;
            try {
                server.matrixConnect(MATRIX_PATH, 0, [1]);
                throw new Error("Should not succeed");
            }
            catch(error) {
                expect(error instanceof Errors.MissingElementContents);
            }
        });        
        it("should have a matrixSet operation on matrix", () => {
            const matrix = server.tree.getElementByPath(MATRIX_PATH);
            matrix.connections[0].setSources([0]);
            server.matrixSet(MATRIX_PATH, 0, [1]);
            expect(matrix.connections[0].sources).toBeDefined();
            expect(matrix.connections[0].sources.length).toBe(1);
            expect(matrix.connections[0].sources[0]).toBe(1);
        });
        it("should have a matrixDisconnect operation on matrix", () => {
            const matrix = server.tree.getElementByPath(MATRIX_PATH);
            matrix.contents.type = EmberLib.MatrixType.nToN;
            matrix.connections[0].setSources([1]);
            server.matrixDisconnect(MATRIX_PATH, 0, [1]);
            expect(matrix.connections[0].sources).toBeDefined();
            expect(matrix.connections[0].sources.length).toBe(0);
        });
    });
    describe("subscribers", () => {
        let jsonTree;
        const PARAMETER_PATH = "0.0.1";
        const MATRIX_PATH = "0.1.0";
        /** @type {EmberServer} */
        let server;
        beforeEach(function() {
            jsonTree = jsonRoot();
            const root = EmberServer.JSONtoTree(jsonTree);
            server = new EmberServer(LOCALHOST, PORT, root);
            server.on("error", () => {
                //ignore
            });
            server.on("clientError", () => {
                //ignore
            });
            return server.listen();
        });
        afterEach(function() {
            return server.close();
        });
        it("should accept client to subscribe to parameter and update those who subscribed", () => {
            const client = new EmberClient(LOCALHOST, PORT);
            const VALUE = "The new Value";
            return client.connect()
            .then(() => client.getDirectory())
            .then(() => client.getElementByPath(PARAMETER_PATH))
            .then(() => {
                // A get directory on non stream is auto subscribe
                expect(server.subscribers).toBeDefined();
                expect(server.subscribers[PARAMETER_PATH]).toBeDefined();
                expect(server.subscribers[PARAMETER_PATH].size).toBe(1);                
                let res;
                    for(let c of server.subscribers[PARAMETER_PATH]) {
                    c.queueMessage = message => {
                        res = message;
                    }
                }
                server.setValue(server.tree.getElementByPath(PARAMETER_PATH), VALUE, null, null);
                expect(res).toBeDefined();
                const resParam = res.getElementByPath(PARAMETER_PATH);
                expect(resParam).toBeDefined();
                expect(resParam.getPath()).toBe(PARAMETER_PATH);
                expect(resParam.contents).toBeDefined();
                expect(resParam.contents.value).toBe(VALUE);
                return client.disconnect();
            });
        });
        it("should accept client to subscribe to matrix and update those who subscribed", () => {
            const client = new EmberClient(LOCALHOST, PORT);
            const VALUE = 17;
            const MatrixParamName = "maximumTotalConnects";
            server.tree.getElementByPath(MATRIX_PATH).contents[MatrixParamName] = 0;
            return client.connect()
            .then(() => client.getDirectory())
            .then(() => client.getElementByPath(MATRIX_PATH))
            .then(() => {
                // A get directory on non stream is auto subscribe
                expect(server.subscribers).toBeDefined();
                expect(server.subscribers[MATRIX_PATH]).toBeDefined();
                expect(server.subscribers[MATRIX_PATH].size).toBe(1);                
                let res;
                    for(let c of server.subscribers[MATRIX_PATH]) {
                    c.queueMessage = message => {
                        res = message;
                    }
                }
                server.setValue(server.tree.getElementByPath(MATRIX_PATH), VALUE, null, MatrixParamName);
                expect(res).toBeDefined();
                const resParam = res.getElementByPath(MATRIX_PATH);
                expect(resParam).toBeDefined();
                expect(resParam.getPath()).toBe(MATRIX_PATH);
                expect(resParam.contents).toBeDefined();
                expect(resParam.contents[MatrixParamName]).toBe(VALUE);
                return client.disconnect();
            });
        });
        it("should clean up subscribers if client not connected anymore", () => {
            const client = new EmberClient(LOCALHOST, PORT);
            const VALUE = "The new Value";
            server.subscribers[PARAMETER_PATH] = new Set();
            server.subscribers[PARAMETER_PATH].add(client);
            expect(server.subscribers[PARAMETER_PATH].size).toBe(1);                
            let res;
                for(let c of server.subscribers[PARAMETER_PATH]) {
                c.queueMessage = message => {
                    res = message;
                }
            }
            server.setValue(server.tree.getElementByPath(PARAMETER_PATH), VALUE, null, null);
            expect(res).not.toBeDefined();
            expect(server.subscribers[PARAMETER_PATH].has(client)).toBeFalsy();
        });
        it("should ignore unsubscribe if no subcribers", () => {
            const client = new EmberClient(LOCALHOST, PORT);
            let error;
            try {
                server.unsubscribe(client, server.tree.getElementByPath(PARAMETER_PATH));
            }
            catch(e) {
                error =e ;
            }
            expect(error).not.toBeDefined();
        });
        it("should ignore serValue on element with no contents", () => {
            const param = server.tree.getElementByPath(PARAMETER_PATH);
            const VALUE = "The new Value";
            param.contents = null;            
            let error;
            try {
                server.setValue(param, VALUE, null, null);
            }
            catch(e) {
                error =e ;
            }
            expect(error).not.toBeDefined();
        });
    });
    describe("EmberServer toJSON", () => {
        it("should have a toJSON", () => {
            const PARAMETER_PATH = "0.0.1";
            const jsonTree = jsonRoot();
            const root = EmberServer.JSONtoTree(jsonTree);
            const server = new EmberServer(LOCALHOST, PORT, root);
            const js = server.toJSON();
            expect(js[0].children[0].children[1].path).toBe(PARAMETER_PATH);
        });
        it("should have a toJSON and return empty array if no tree", () => {
            const server = new EmberServer(LOCALHOST, PORT, null);
            const js = server.toJSON();
            expect(js).toBeDefined();
            expect(js.length).toBe(0);
        });
    });
    describe("replaceElement", () => {
        it("should replace existing element with new one", () => {
            const PARAMETER_PATH = "0.0.1";
            const VALUE = "Gilles Dufour"
            const jsonTree = jsonRoot();
            const root = EmberServer.JSONtoTree(jsonTree);
            const server = new EmberServer(LOCALHOST, PORT, root);
            const newParam = new EmberLib.Parameter(1);
            newParam.contents = new EmberLib.ParameterContents(VALUE);
            newParam.path = PARAMETER_PATH;
            server.replaceElement(newParam);
            expect(server.tree.getElementByPath(PARAMETER_PATH).contents.value).toBe(VALUE);
        });
        it("should throw an error if unknown element path", () => {
            const VALUE = "Gilles Dufour"
            const jsonTree = jsonRoot();
            const root = EmberServer.JSONtoTree(jsonTree);
            const server = new EmberServer(LOCALHOST, PORT, root);
            const newParam = new EmberLib.Parameter(1000);
            newParam.contents = new EmberLib.ParameterContents(VALUE);
            let error;
            try {
                server.replaceElement(newParam);
            }
            catch(e) {
                error = e;
            }
            expect(error).toBeDefined();
            expect(error instanceof Errors.UnknownElement).toBeTruthy();
        });
        it("should throw an error if trying to replace root or unattached element", () => {
            const PARAMETER_PATH = "0.0.1";
            const VALUE = "Gilles Dufour"
            const jsonTree = jsonRoot();
            const root = EmberServer.JSONtoTree(jsonTree);
            const server = new EmberServer(LOCALHOST, PORT, root);
            server.tree.getElementByPath(PARAMETER_PATH)._parent = null;
            const newParam = new EmberLib.Parameter(1);
            newParam.contents = new EmberLib.ParameterContents(VALUE);
            newParam.path = PARAMETER_PATH;
            let error;
            try {
                server.replaceElement(newParam);
            }
            catch(e) {
                error = e;
            }
            expect(error).toBeDefined();
            expect(error instanceof Errors.InvalidEmberNode).toBeTruthy();
        });
    });
    describe("Events", () => {
        it("should catch error emitted by internal tcp server", () => {
            const jsonTree = jsonRoot();
            const root = EmberServer.JSONtoTree(jsonTree);
            const ERROR_MESSAGE = "gdnet internal error";
            server = new EmberServer(LOCALHOST, PORT, root);
            let error;
            server.on("error", e => {error = e;});
            server.server.emit("error", new Error(ERROR_MESSAGE));
            expect(error).toBeDefined();
            expect(error.message).toBe(ERROR_MESSAGE);
        });
        it("should catch tcp server disconnected message, and clean up clients", () => {
            const jsonTree = jsonRoot();
            const root = EmberServer.JSONtoTree(jsonTree);
            const server = new EmberServer(LOCALHOST, PORT, root);
            server.clients.add(new EmberClient(LOCALHOST, PORT));
            let count = 0;
            server.on("disconnected", () => {count++;});
            server.server.emit("disconnected");
            expect(count).toBe(1);
            expect(server.clients.size).toBe(0);
        });
        it("should catch error from connection to clients", () => {
            const jsonTree = jsonRoot();
            const root = EmberServer.JSONtoTree(jsonTree);
            const ERROR_MESSAGE = "gdnet internal error";
            const server = new EmberServer(LOCALHOST, PORT, root);
            const client = new EmberClient(LOCALHOST, PORT);
            client.remoteAddress = () => {return "address";}
            let info;
            server.on("clientError", data => {info = data;});
            server.server.emit("connection", client);
            client.emit("error", new Error(ERROR_MESSAGE));
            expect(info).toBeDefined();
            expect(info.error.message).toBe(ERROR_MESSAGE);
        });
    });
});
