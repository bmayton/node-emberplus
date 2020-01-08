const EventEmitter = require('events').EventEmitter;
const S101Server = require('../EmberSocket').S101Server;
const ember = require('../EmberLib');
const JSONParser = require("./JSONParser");
const ElementHandlers = require("./ElementHandlers");
const {Logger, LogLevel} = require("../Logger");

class TreeServer extends EventEmitter{
    /**
     * 
     * @param {string} host 
     * @param {number} port 
     * @param {TreeNode} tree 
     */
    constructor(host, port, tree) {
        super();
        this._debug = false;
        this.callback = undefined;
        this.timeoutValue = 2000;
        this.server = new S101Server(host, port);
        this.tree = tree;
        this.clients = new Set();
        this.subscribers = {};
        this._handlers = new ElementHandlers(this);
        this.logger = new Logger();
        this.logLevel = LogLevel.INFO;
        this._loggers = {
            debug: (...args) => this._log(LogLevel.DEBUG, ...args),
            error: (...args) => this._log(LogLevel.ERROR, ...args),
            info: (...args) => this._log(LogLevel.INFO, ...args),
            warn: (...args) => this._log(LogLevel.WARN, ...args)
        };

        this.server.on('listening', () => {
            this.log.debug("listening");
            this.emit('listening');
            if (this.callback !== undefined) {
                this.callback();
                this.callback = undefined;
            }
        });

        this.server.on('connection', client => {
            this.log.debug("ember new connection from", client.remoteAddress());
            this.clients.add(client);
            client.on("emberTree", (root) => {
                this.log.debug("ember new request from", client.remoteAddress(), root);
                // Queue the action to make sure responses are sent in order.
                client.addRequest(() => {
                    try {
                        let path = this.handleRoot(client, root);
                        this.emit("request", {client: client.remoteAddress(), root: root, path: path});
                    }
                    catch(e) {
                        this.log.debug(e.stack)
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
            this.emit('disconnected');
        });

        this.server.on("error", (e) => {
            this.emit("error", e);
            if (this.callback !== undefined) {
                this.callback(e);
            }
        });
    }

    /**
     *
     * @param {Array<string>} params
     * @private
     */
    _log(...params) {
        if ((params.length > 1) && (Number(params[0]) <= this.logLevel)) {
            const msg = params.slice(1);            
            this.logger[Logger.LogLevel[params[0]]](`[${Logger.LogLevel[params[0]]}]:`, ...msg);
        }
    }

    /**
     *
     * @returns {{debug: (function(...[*]): void), error: (function(...[*]): void), info: (function(...[*]): void), warn: (function(...[*]): void)}|*}
     */
    get log() {
        return this._loggers;
    }

    /**
     * @returns {Promise}
     */
    close() {
        return new Promise((resolve, reject) => {
            this.callback = (e) => {
                if (e == null) {
                    return resolve();
                }
                return reject(e);
            };
            this.server.server.close();
        });
    }

    /**
     * 
     * @param {TreeNode} element 
     */
    getResponse(element) {
        return element.getTreeBranch(undefined, node => {
            node.update(element);
            let children = element.getChildren();
            if (children != null) {
                for (let i = 0; i < children.length; i++) {
                    node.addChild(children[i].getDuplicate());
                }
            }
            else {
                this.log.debug("getResponse","no children");
            }
        });
    }

    /**
     * 
     * @param {TreeNode} element 
     */
    getQualifiedResponse(element) {
        const res = new ember.Root();
        let dup;
        if (element.isRoot() === false) {
            dup = element.toQualified();
        }
        let children = element.getChildren();
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
        if (client !== undefined) {
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
    
        if (node.path !== undefined) {
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
        return new Promise((resolve, reject) => {
            this.callback = (e) => {
                if (e == null) {
                    return resolve();
                }
                return reject(e);
            };
            this.server.listen();
        });
    }

    /**
     * 
     * @param {string} path 
     * @param {number} target 
     * @param {number[]} sources 
     */
    matrixConnect(path, target, sources) {
        doMatrixOperation(this, path, target, sources, ember.MatrixOperation.connect);
    }

    /**
     * 
     * @param {string} path 
     * @param {number} target 
     * @param {number[]} sources 
     */
    matrixDisconnect(path, target, sources) {
        doMatrixOperation(this, path, target, sources, ember.MatrixOperation.disconnect);
    }

    /**
     * 
     * @param {string} path 
     * @param {number} target 
     * @param {number[]} sources 
     */
    matrixSet(path, target, sources) {
        doMatrixOperation(this, path, target, sources, ember.MatrixOperation.absolute);
    }

    /**
     * 
     * @param {TreeNode} element 
     */
    replaceElement(element) {
        let path = element.getPath();
        let parent = this.tree.getElementByPath(path);
        if ((parent == null)||(parent._parent == null)) {
            throw new Error(`Could not find element at path ${path}`);
        }
        parent = parent._parent;
        const children = parent.getChildren();
        for(let i = 0; i <= children.length; i++) {
            if (children[i] && children[i].getPath() == path) {
                element._parent = parent; // move it to new tree.
                children[i] = element;
                let res = this.getResponse(element);
                this.updateSubscribers(path,res);
                return;
            }
        }
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
            if (element.contents == null) {
                return resolve();
            }
            if (element.isParameter() || element.isMatrix()) {
                if (element.isParameter() &&
                    (element.contents.access !== undefined) &&
                    (element.contents.access.value > 1)) {
                    element.contents.value = value;
                    const res = this.getResponse(element);
                    this.updateSubscribers(element.getPath(),res, origin);                    
                }
                else if ((key !== undefined) && (element.contents.hasOwnProperty(key))) {
                    element.contents[key] = value;
                    const res = this.getResponse(element);
                    this.updateSubscribers(element.getPath(),res, origin);
                }
                const src = origin == null ? "local" : `${origin.socket.remoteAddress}:${origin.socket.remotePort}`;
                this.emit("value-change", element);
                this.emit("event", `set value for ${element.contents.identifier}(path: ${element.getPath()}) from ${src}` );
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
            return;
        }
    
        for (let client of this.subscribers[path]) {
            if (client === origin) {
                continue; // already sent the response to origin
            }
            if (this.clients.has(client)) {
                client.queueMessage(response);
            }
            else {
                // clean up subscribers - client is gone
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
        const tree = new ember.Root();
        JSONParser.parseObj(tree, obj);
        return tree;
    }
}


const validateMatrixOperation = function(matrix, target, sources) {
    if (matrix == null) {
        throw new Error(`matrix not found`);
    }
    if (matrix.contents == null) {
        throw new Error(`invalid matrix at ${matrix.getPath()} : no contents`);
    }
    if (matrix.contents.targetCount == null) {
        throw new Error(`invalid matrix at ${matrix.getPath()} : no targetCount`);
    }
    if ((target < 0) || (target >= matrix.contents.targetCount)) {
        throw new Error(`target id ${target} out of range 0 - ${matrix.contents.targetCount}`);
    }
    if (sources.length == null) {
        throw new Error("invalid sources format");
    }
}

const doMatrixOperation = function(server, path, target, sources, operation) {
    let matrix = server.tree.getElementByPath(path);

    validateMatrixOperation(matrix, target, sources);

    let connection = new ember.MatrixConnection(target);
    connection.sources = sources;
    connection.operation = operation;
    server.handleMatrixConnections(undefined, matrix, [connection], false);
}

module.exports = TreeServer;
