const EventEmitter = require('events').EventEmitter;
const S101Server = require('../EmberSocket').S101Server;
const EmberLib = require('../EmberLib');
const JSONParser = require("./JSONParser");
const ElementHandlers = require("./ElementHandlers");
const ServerEvents = require("./ServerEvents");
const Errors = require("../Errors");
const winston = require("winston");

class TreeServer extends EventEmitter{
    /**
     * 
     * @param {string} host 
     * @param {number} port 
     * @param {TreeNode} tree 
     */
    constructor(host, port, tree) {
        super();
        this._debug = true;
        this.timeoutValue = 2000;
        this.server = new S101Server(host, port);
        this.tree = tree;
        this.clients = new Set();
        this.subscribers = {};
        this._handlers = new ElementHandlers(this);

        this.server.on('listening', () => {
            winston.debug("listening");
            this.emit('listening');
        });

        this.server.on('connection', client => {
            winston.debug("ember new connection from", client.remoteAddress());
            this.clients.add(client);
            client.on("emberTree", (root) => {
                winston.debug("ember new request from", client.remoteAddress(), root);
                // Queue the action to make sure responses are sent in order.
                client.addRequest(() => {
                    try {
                        const path = this.handleRoot(client, root);
                        this.emit("request", {client: client.remoteAddress(), root: root, path: path});
                    }
                    catch(e) {
                        winston.debug(e.stack);
                        this.emit("error", e);
                    }
                });
            });
            client.on("disconnected", () => {
                this.clients.delete(client);
                this.emit('disconnect', client.remoteAddress());
            });
            client.on("error", error => {
                this.emit('clientError', { remoteAddress: client.remoteAddress(), error });
            });
            this.emit('connection', client.remoteAddress());
        });

        this.server.on('disconnected', () => {
            this.clients.clear();
            this.emit('disconnected');
        });

        this.server.on("error", (e) => {
            this.emit("error", e);
        });
    }

    /**
     * @returns {Promise}
     */
    close() {
        return new Promise((resolve, reject) => {
            const cb = e => {
                if (e == null) {
                    return resolve();
                }
                return reject(e);
            };
            if (this.server.server != null) {
                this.server.server.close(cb);                
            }
            else {
                cb();
            }
            this.clients.clear();
        });
    }

    /**
     * 
     * @param {Matrix} matrix 
     * @param {number} targetID
     * @returns {number}
     */
    getDisconnectSource(matrix, targetID) {
        return this._handlers.getDisconnectSource(matrix, targetID);
    }

    /**
     * 
     * @param {TreeNode} element
     * @returns {TreeNode}
     */
    getResponse(element) {
        return element.getTreeBranch(undefined, node => {
            node.update(element);
            const children = element.getChildren();
            if (children != null) {
                for (let i = 0; i < children.length; i++) {
                    node.addChild(children[i].getDuplicate());
                }
            }
        });
    }

    /**
     * 
     * @param {TreeNode} element 
     */
    getQualifiedResponse(element) {
        const res = new EmberLib.Root();
        let dup;
        if (element.isRoot() === false) {
            dup = element.toQualified();
        }
        const children = element.getChildren();
        if (children != null) {
            for (let i = 0; i < children.length; i++) {
                res.addChild(children[i].toQualified().getMinimalContent());
            }
        }
        else {
            res.addChild(dup);
        }
        return res;
    }

    /**
     * 
     * @param {S101Client} client 
     * @param {TreeNode} root 
     */
    handleError(client, node) {
        if (client != null) {
            const res = node == null ? this.tree.getMinimal() : node;
            client.sendBERNode(res);
        }
    }

    /**
     * 
     * @param {S101Socket} client 
     * @param {TreeNode} root 
     */
    handleRoot(client, root) {
        if ((root == null) || (root.elements == null) || (root.elements.size < 1)) {
            // ignore empty requests.
            return;
        }
    
        const node = root.getChildren()[0];
        client.request = node;
    
        if (node.path != null) {
            return this._handlers.handleQualifiedNode(client, node);
        }
        else if (node.isCommand()) {
            // Command on root element
            this._handlers.handleCommand(client, this.tree, node);
            return "root";
        }
        else {
            return this._handlers.handleNode(client, node);
        }
    }

    /**
     * @returns {Promise}
     */
    listen() {
        return this.server.listen();
    }

    /**
     * 
     * @param {string} path 
     * @param {number} target 
     * @param {number[]} sources 
     */
    matrixConnect(path, target, sources) {
        doMatrixOperation(this, path, target, sources, EmberLib.MatrixOperation.connect);
    }

    /**
     * 
     * @param {string} path 
     * @param {number} target 
     * @param {number[]} sources 
     */
    matrixDisconnect(path, target, sources) {
        doMatrixOperation(this, path, target, sources, EmberLib.MatrixOperation.disconnect);
    }

    /**
     * 
     * @param {string} path 
     * @param {number} target 
     * @param {number[]} sources 
     */
    matrixSet(path, target, sources) {
        doMatrixOperation(this, path, target, sources, EmberLib.MatrixOperation.absolute);
    }

    /**
     * 
     * @param {Matrix} matrix 
     * @param {number} target 
     * @param {number[]} sources 
     * @param {S101Socket} client 
     * @param {boolean} response 
     */
    disconnectMatrixTarget(matrix, target, sources, client, response) {
        const disconnect = new EmberLib.MatrixConnection(target);
        disconnect.setSources([]);
        disconnect.disposition = EmberLib.MatrixDisposition.modified;        
        matrix.setSources(target, []);
        if (response) {
            this.emit("matrix-disconnect", {
                target: target,
                sources: sources,
                client: client == null ? null : client.remoteAddress()
            });
        }
        return disconnect;
    }

    /**
     * 
     * @param {Matrix} matrix 
     * @param {number} target 
     * @param {number[]} sources 
     * @param {S101Socket} client 
     * @param {boolean} response 
     */
    disconnectSources(matrix, target, sources, client, response) {
        const disconnect = new EmberLib.MatrixConnection(target);
        disconnect.disposition = EmberLib.MatrixDisposition.modified;        
        matrix.disconnectSources(target, sources);
        if (response) {
            this.emit("matrix-disconnect", {
                target: target,
                sources: sources,
                client: client == null ? null : client.remoteAddress()
            });
        }
        return disconnect;
    }

    /**
     * 
     * @param {Matrix} matrix 
     * @param {MatrixConnection} connection 
     * @param {Matrix} res - result
     * @param {S101Socket} client 
     * @param {boolean} response 
     */
    preMatrixConnect(matrix, connection, res, client, response) {
        const conResult = res.connections[connection.target];
        
        if (matrix.contents.type !== EmberLib.MatrixType.nToN && 
            connection.operation !== EmberLib.MatrixOperation.disconnect &&
            connection.sources != null && connection.sources.length === 1) {
            if (matrix.contents.type === EmberLib.MatrixType.oneToOne) {
                // if the source is being used already, disconnect it from current target.
                const currentTargets = matrix.getSourceConnections(connection.sources[0]);
                if (currentTargets.length === 1 && currentTargets[0] !== connection.target) {
                    res.connections[currentTargets[0]] = 
                    this.disconnectMatrixTarget(matrix, currentTargets[0], connection.sources, client, response);
                }
            }
            // if the target is connected already, disconnect it
            if (matrix.connections[connection.target].sources != null && 
                matrix.connections[connection.target].sources.length === 1) {
                if (matrix.contents.type === EmberLib.MatrixType.oneToN) {
                    const disconnectSource = this.getDisconnectSource(matrix, connection.target);
                    if (matrix.connections[connection.target].sources[0] == connection.sources[0]) {
                        if (disconnectSource >= 0 && disconnectSource != connection.sources[0]) {
                            connection.sources = [disconnectSource];
                        }
                        else {
                            // do nothing => set disposition to bypass further processing
                            conResult.disposition = EmberLib.MatrixDisposition.tally;
                        }
                    }
                }
                if (matrix.connections[connection.target].sources[0] !== connection.sources[0]) {
                    this.disconnectMatrixTarget(matrix, connection.target, matrix.connections[connection.target].sources, client, response)
                }
                else if (matrix.contents.type === EmberLib.MatrixType.oneToOne) {
                    // let's change the request into a disconnect
                    connection.operation = EmberLib.MatrixOperation.disconnect;
                }
            }
        }
    }

    applyMatrixConnect(matrix, connection, conResult, client, response) {
        // Apply changes
        let emitType;
        if ((connection.operation == null) ||
        (connection.operation.value == EmberLib.MatrixOperation.absolute)) {
            matrix.setSources(connection.target, connection.sources);
            emitType = "matrix-change";
        }
        else if (connection.operation == EmberLib.MatrixOperation.connect) {
            matrix.connectSources(connection.target, connection.sources);
            emitType = "matrix-connect";
        }
        conResult.disposition = EmberLib.MatrixDisposition.modified;
        if (response && emitType != null) {            
            // We got a request so emit something.
            this.emit(emitType, {
                target: connection.target,
                sources: connection.sources,
                client: client == null ? null : client.remoteAddress()
            });
        }   
    }

    /**
     * 
     * @param {Matrix} matrix 
     * @param {MatrixConnection} connection 
     * @param {Matrix} res - result
     * @param {S101Socket} client 
     * @param {boolean} response 
     */
    applyMatrixOneToNDisconnect(matrix, connection, res, client, response) {
        const disconnectSource = this.getDisconnectSource(matrix, connection.target);
        if (matrix.connections[connection.target].sources[0] == connection.sources[0]) {
            const conResult = res.connections[connection.target];
            if (disconnectSource >= 0 && disconnectSource != connection.sources[0]) {
                if (response) {
                    this.server.emit("matrix-disconnect", {
                        target: connection.target,
                        sources: matrix.connections[connection.target].sources,
                        client: client == null ? null : client.remoteAddress()
                    });
                }
                matrix.setSources(connection.target, [disconnectSource]);
                conResult.disposition = EmberLib.MatrixDisposition.modified;
            }
            else {
                // do nothing
                conResult.disposition = EmberLib.MatrixDisposition.tally;
            }
        }
    }

    /**
     * 
     * @param {TreeNode} element 
     */
    replaceElement(element) {
        const path = element.getPath();
        const existingElement = this.tree.getElementByPath(path);
        if (existingElement == null) {
            throw new Errors.UnknownElement(path);
        }
        const parent = existingElement._parent;
        if (parent == null) {
            throw new Errors.InvalidEmberNode(path, "No parent. Can't execute replaceElement");
        }
        // Replace the element at the parent
        parent.elements.set(existingElement.getNumber(), element);
        // point the new element to parent
        element._parent = parent;
        const res = this.getResponse(element);
        this.updateSubscribers(path,res);
    }

    /**
     * 
     * @param {TreeNode} element 
     * @param {string|number} value
     * @param {S101Socket} origin
     * @param {string} key
     */
    setValue(element, value, origin, key) {
        return new Promise(resolve => {
            // Change the element value if write access permitted.
            winston.debug("New Setvalue request");
            if (element.contents == null) {
                return resolve();
            }
            if (element.isParameter() || element.isMatrix()) {
                if (element.isParameter() &&
                    (element.contents.access != null) &&
                    (element.contents.access.value > 1)) {
                    element.contents.value = value;
                    winston.debug("New value ", value, "path", element.getPath());
                    const res = this.getResponse(element);
                    this.updateSubscribers(element.getPath(),res, origin);                    
                }
                else if ((key != null) && (element.contents.hasOwnProperty(key))) {
                    element.contents[key] = value;
                    const res = this.getResponse(element);
                    this.updateSubscribers(element.getPath(),res, origin);
                }
                const src = origin == null ? "local" : `${origin.socket.remoteAddress}:${origin.socket.remotePort}`;
                this.emit("value-change", element);
                this.emit("event", ServerEvents.SETVALUE(element.contents.identifier,element.getPath(),src));
            }
            return resolve();
        });
    }

    /**
     * 
     * @param {S101Socket} client 
     * @param {TreeNode} root 
     */
    subscribe(client, element) {
        const path = element.getPath();
        if (this.subscribers[path] == null) {
            this.subscribers[path] = new Set();
        }
        this.subscribers[path].add(client);
    }

    /**
     * @returns {Object}
     */
    toJSON() {
        if (this.tree == null) {
            return [];
        }
        const elements = this.tree.getChildren();
    
        return elements.map(element => element.toJSON());
    }

    /**
     * 
     * @param {S101Client} client 
     * @param {TreeNode} root 
     */
    unsubscribe(client, element) {
        const path = element.getPath();
        if (this.subscribers[path] == null) {
            return;
        }
        this.subscribers[path].delete(client);
    }

    /**
     * 
     * @param {string} path 
     * @param {TreeNode} response 
     * @param {S101Socket} origin 
     */
    updateSubscribers(path, response, origin) {
        if (this.subscribers[path] == null) {
            winston.debug("No subscribers for", path);
            return;
        }
    
        for (let client of this.subscribers[path]) {
            if (client === origin) {
                continue; // already sent the response to origin
            }
            if (this.clients.has(client)) {
                winston.debug("Sending new value to", client.remoteAddress());
                client.queueMessage(response);
            }
            else {
                // clean up subscribers - client is gone
                winston.debug("deleting client");
                this.subscribers[path].delete(client);
            }
        }
    }

    /**
     * 
     * @param {object} obj 
     * @returns {TreeNode}
     */
    static JSONtoTree(obj) {
        const tree = new EmberLib.Root();
        JSONParser.parseObj(tree, obj);
        return tree;
    }
}


const validateMatrixOperation = function(matrix, target, sources) {
    if (matrix == null) {
        throw new Errors.UnknownElement(`matrix not found`);
    }
    if (matrix.contents == null) {
        throw new Errors.MissingElementContents(matrix.getPath());
    }
    matrix.validateConnection(target, sources);
}

const doMatrixOperation = function(server, path, target, sources, operation) {
    const matrix = server.tree.getElementByPath(path);

    validateMatrixOperation(matrix, target, sources);

    const connection = new EmberLib.MatrixConnection(target);
    connection.sources = sources;
    connection.operation = operation;
    server._handlers.handleMatrixConnections(undefined, matrix, [connection], false);
}

module.exports = TreeServer;
