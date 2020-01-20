const EventEmitter = require('events').EventEmitter;
const S101Client = require('../EmberSocket').S101Client;
const ember = require('../EmberLib');
const BER = require('../ber.js');
const Errors = require('../Errors.js');
const winston = require("winston");

const DEFAULT_PORT = 9000;
const DEFAULT_TIMEOUT = 3000;

/** 
 * @typedef {{
 *  node: TreeNode,
 *  func: function
 * }} REQUEST
 * 
 */

class EmberClient extends EventEmitter {
    /**
     * 
     * @param {string} host 
     * @param {number} port 
     */
    constructor(host, port = DEFAULT_PORT) {
        super();
        this._debug = false;
        /** @type {REQUEST[]} */
        this._pendingRequests = [];
        /** @type {REQUEST} */
        this._activeRequest = null;
        this._timeout = null;
        this._callback = undefined;
        this._requestID = 0;
        this._client = new S101Client(host, port);
        this.timeoutValue = DEFAULT_TIMEOUT;
        /** @type {Root} */
        this.root = new ember.Root();

        this._client.on('connecting', () => {
            this.emit('connecting');
        });

        this._client.on('connected', () => {
            this.emit('connected');
            if (this._callback != null) {
                this._callback();
            }
        });

        this._client.on('disconnected', () => {
            this.emit('disconnected');
        });

        this._client.on("error", e => {
            if (this._callback != null) {
                this._callback(e);
            }
            this.emit("error", e);
        });

        this._client.on('emberTree', root => {
            try {
                if (root instanceof ember.InvocationResult) {
                    this.emit('invocationResult', root);
                    winston.debug("Received InvocationResult", root);
                } else {
                    this._handleRoot(root);
                    winston.debug("Received root", root);
                }
                if (this._callback) {
                    this._callback(undefined, root);
                }
            }
            catch(e) {
                winston.debug(e, root);
                if (this._callback) {
                    this._callback(e);
                }
            }
        });
    }

    _finishRequest() {
        this._clearTimeout();
        this._callback = undefined;
        this._activeRequest = null;
        try {
            this._makeRequest();
        } catch(e) {
            winston.debug(e);
            if (this._callback != null) {
                this._callback(e);
            }
            this.emit("error", e);
        }
    }

    _makeRequest() {
        if (this._activeRequest == null && this._pendingRequests.length > 0) {
            this._activeRequest = this._pendingRequests.shift();
            const req = `${ this._requestID++} - ${this._activeRequest.node.getPath()}`;
            this._activeRequest.timeoutError = new Errors.EmberTimeoutError(`Request ${req} timed out`)
           
            winston.debug(`Making request ${req}`, Date.now());
            this._timeout = setTimeout(() => {
                this._timeoutRequest();
            }, this.timeoutValue);
            this._activeRequest.func();
        }
    }

    _timeoutRequest() {
        this._activeRequest.func(this._activeRequest.timeoutError);
    }

    /**
     * 
     * @param {function} req 
     */
    addRequest(req) {
        this._pendingRequests.push(req);
        this._makeRequest();
    }
    
    _clearTimeout() {
        if (this._timeout != null) {
            clearTimeout(this._timeout);
            this._timeout = null;
        }
    }

    /**
     * 
     * @param {TreeNode} parent 
     * @param {TreeNode} node 
     */
    _handleNode(parent, node) {
        let n = parent.getElementByNumber(node.getNumber());
        if (n === null) {
            parent.addChild(node);
            n = node;
        } else {
            n.update(node);
        }
    
        const children = node.getChildren();
        if (children !== null) {
            for (let i = 0; i < children.length; i++) {
                this._handleNode(n, children[i]);
            }
        }
        else {
            this.emit("value-change", node);
        }
        return;
    }

    /**
     * 
     * @param {TreeNode} parent 
     * @param {TreeNode} node 
     */
    _handleQualifiedNode(parent, node) {
        let element = parent.getElementByPath(node.path);
        if (element !== null) {
            this.emit("value-change", node);
            element.update(node);
        }
        else {
            const path = node.path.split(".");
            if (path.length === 1) {
                this.root.addChild(node);
            }
            else {
                // Let's try to get the parent
                path.pop();
                parent = this.root.getElementByPath(path.join("."));
                if (parent === null) {
                    return;
                }
                parent.addChild(node);
                parent.update(parent);
            }
            element = node;
        }
    
        const children = node.getChildren();
        if (children !== null) {
            for (let i = 0; i < children.length; i++) {
                if (children[i].isQualified()) {
                    this._handleQualifiedNode(element, children[i]);
                }
                else {
                    this._handleNode(element, children[i]);
                }
            }
        }
    
        return;
    }

    /**
     * 
     * @param {TreeNode} root 
     */
    _handleRoot (root) {
        winston.debug("handling root", JSON.stringify(root));
        this.root.update(root);
        if (root.elements != null) {
            const elements = root.getChildren();
            for (let i = 0; i < elements.length; i++) {
                if (elements[i].isQualified()) {
                    this._handleQualifiedNode(this.root, elements[i]);
                }
                else {
                    this._handleNode(this.root, elements[i]);
                }
            }
        }
        if (this._callback) {
            this._callback(null, root);
        }
    }

    /**
     * 
     * @param {number} timeout 
     */
    connect(timeout = 2) {
        return new Promise((resolve, reject) => {
            this._callback = e => {
                this._callback = undefined;
                if (e === undefined) {
                    return resolve();
                }
                return reject(e);
            };
            if ((this._client != null) && (this._client.isConnected())) {
                this._client.disconnect();
            }
            this._client.connect(timeout);
        });
    }

    /**
     * @returns {Promise}
     */
    disconnect() {
        if (this._client != null) {
            return this._client.disconnect();
        }
        return Promise.resolve();
    }

    /**
     * 
     * @param {TreeNode} qnode 
     * @param {function} callback=null
     * @returns {Promise}
     */
    expand(node, callback = null) {
        if (node == null) {
            return Promise.reject(new Errors.InvalidEmberNode("Invalid null node"));
        }
        if (node.isParameter() || node.isMatrix() || node.isFunction()) {
            return this.getDirectory(node);
        }    
        return this.getDirectory(node, callback).then(res => {
            const children = node.getChildren();
            if ((res == null) || (children == null)) {
                winston.debug("No more children for ", node);
                return;
            }
            let directChildren = Promise.resolve();
            for (let child of children) {
                if (child.isParameter()) {
                    // Parameter can only have a single child of type Command.
                    continue;
                }
                directChildren = directChildren.then(() => {
                    return this.expand(child, callback).catch((e) => {
                        // We had an error on some expansion
                        // let's save it on the child itthis
                        child.error = e;
                    });
                });
            }
            return directChildren
        });
    }

    /**
     * 
     * @param {TreeNode} qnode 
     * @param {function} callback=null
     * @returns {Promise}
     */
    getDirectory(qnode, callback = null) {        
        if (qnode == null) {
            this.root.clear();
            qnode = this.root;
        }
        return new Promise((resolve, reject) => {
            this.addRequest({node: qnode, func: error => {
                if (error) {
                    this._finishRequest();
                    return reject(error);
                }
    
                this._callback = (error, node) => {
                    const requestedPath = qnode.getPath();
                    if (node == null) { 
                        winston.debug(`received null response for ${requestedPath}`);
                        // ignore
                        return; 
                    }
                    if (error) {
                        winston.debug("Received getDirectory error", error);
                        this._finishRequest();
                        return reject(error);
                    }
                    if (qnode.isRoot()) {
                        const elements = qnode.getChildren();
                        if (elements == null || elements.length === 0) {
                            winston.debug("getDirectory response", node);
                            return reject(new Errors.InvalidEmberNode());
                        }
    
                        const nodeElements = node == null ? null : node.getChildren();
    
                        if (nodeElements != null
                            && nodeElements.every(el => el._parent instanceof ember.Root)) {
                            winston.debug("Received getDirectory response", node);
                            this._finishRequest();
                            return resolve(node); // make sure the info is treated before going to next request.
                        }
                        else {
                            return this._callback(new Errors.InvalidEmberResponse(`getDirectory ${requestedPath}`));
                        }
                    }
                    else if (node.getElementByPath(requestedPath) != null) {
                        this._finishRequest();
                        return resolve(node); // make sure the info is treated before going to next request.
                    }
                    else {
                        const nodeElements = node == null ? null : node.getChildren();
                        if (nodeElements != null &&
                            ((qnode.isMatrix() && nodeElements.length === 1 && nodeElements[0].getPath() === requestedPath) ||
                             (!qnode.isMatrix() && nodeElements.every(el => isDirectSubPathOf(el.getPath(), requestedPath))))) {
                            winston.debug("Received getDirectory response", node);
                            this._finishRequest();
                            return resolve(node); // make sure the info is treated before going to next request.
                        }
                        else {
                            winston.debug(node);
                            winston.debug(new Error(requestedPath));
                        }
                    }
                };
                winston.debug("Sending getDirectory", qnode);
                try {
                    this._client.sendBERNode(qnode.getDirectory(callback));
                }
                catch(e) {
                    reject(e);
                }
            }});
        });
    }

    /**
     * 
     * @param {string} path ie: "path/to/destination"
     * @param {function} callback=null
     * @returns {Promise<TreeNode>}
     */
    getElementByPath(path, callback=null) {
        const pathError = new Errors.PathDiscoveryFailure(path);
        const TYPE_NUM = 1;
        const TYPE_ID = 2;
        let type = TYPE_NUM;
        let pathArray = [];
        if (path.indexOf("/") >= 0) {
            type = TYPE_ID;
            pathArray = path.split("/");
        }
        else {
            pathArray = path.split(".");
            if (pathArray.length === 1) {
                if (isNaN(Number(pathArray[0]))) {
                    type = TYPE_ID;
                }
            }
        }
        let pos = 0;
        let lastMissingPos = -1;
        let currentNode = this.root;
        const getNext = () => {
            return Promise.resolve()
            .then(() => {                
                let node;
                if (type === TYPE_NUM) {
                    const number = Number(pathArray[pos]);
                    node = currentNode.getElementByNumber(number);                
                }
                else {                    
                    const children = currentNode.getChildren();
                    const identifier = pathArray[pos];
                    if (children != null) {
                        let i = 0;
                        for (i = 0; i < children.length; i++) {
                            node = children[i];
                            if (node.contents != null && node.contents.identifier === identifier) {
                                break;
                            }
                        }
                        if (i >= children.length) {
                            node = null;
                        }
                    }
                }
                if (node != null) {
                    // We have this part already.
                    pos++;
                    if (pos >= pathArray.length) {
                        return node;
                    }
                    currentNode = node;                   
                    return getNext();
                }
                // We do not have that node yet.
                if (lastMissingPos === pos) {
                    throw pathError;
                }
                lastMissingPos = pos;
                return this.getDirectory(currentNode, callback).then(() => getNext());
            });
        }
        return getNext();
    }

    /**
     * 
     * @param {TreeNode} fnNode 
     * @param {FunctionArgument[]} params 
     */
    invokeFunction(fnNode, params) {
        return new Promise((resolve, reject) => {
            this.addRequest({node: fnNode, func: (error) => {
                if (error) {
                    reject(error);
                    this._finishRequest();
                    return;
                }
                const cb = (error, result) => {
                    this._clearTimeout();
                    if (error) {
                        reject(error);
                    }
                    else {
                        winston.debug("InvocationResult", result);
                        resolve(result);
                    }
                    // cleaning callback and making next request.
                    this._finishRequest();
                };
                winston.debug("Invocking function", fnNode);
                this._callback = cb;
                this._client.sendBERNode(fnNode.invoke(params));
            }});
        })
    }

    /**
     * @returns {boolean}
     */
    isConnected() {
        return ((this._client != null) && (this._client.isConnected()));
    }

    /**
     * 
     * @param {Matrix} matrixNode 
     * @param {number} targetID 
     * @param {number[]} sources 
     * @param {MatrixOperation} operation 
     */
    matrixOPeration(matrixNode, targetID, sources, operation = ember.MatrixOperation.connect) {
        return new Promise((resolve, reject) => {
            if (!Array.isArray(sources)) {
                return reject(new Errors.InvalidSourcesFormat());
            }
            try {
                matrixNode.validateConnection(targetID, sources);
            }
            catch(e) {
                return reject(e);
            }
            const connections = {}
            const targetConnection = new ember.MatrixConnection(targetID);
            targetConnection.operation = operation;
            targetConnection.setSources(sources); 
            connections[targetID] = targetConnection;
    
            this.addRequest({node: matrixNode, func: (error) => {
                if (error) {
                    this._finishRequest();
                    reject(error);
                    return;
                }
    
                this._callback = (error, node) => {
                    const requestedPath = matrixNode.getPath();
                    if (node == null) { 
                        winston.debug(`received null response for ${requestedPath}`);
                        return; 
                    }
                    if (error) {
                        winston.debug("Received getDirectory error", error);
                        this._clearTimeout(); // clear the timeout now. The resolve below may take a while.
                        this._finishRequest();
                        reject(error);
                        return;
                    }
                    let matrix = null;
                    if (node != null) {
                        matrix = node.getElementByPath(requestedPath);
                    }
                    if (matrix != null && matrix.isMatrix() && matrix.getPath() === requestedPath) {
                        this._clearTimeout(); // clear the timeout now. The resolve below may take a while.
                        this._finishRequest();
                        resolve(matrix);
                    }
                    else {
                        winston.debug(`unexpected node response during matrix connect ${requestedPath}`, 
                            matrix == null ? null : JSON.stringify(matrix.toJSON(), null, 4));
                    }
                }
                this._client.sendBERNode(matrixNode.connect(connections));
            }});
        });
    }

    /**
     * 
     * @param {Matrix} matrixNode 
     * @param {number} targetID 
     * @param {number[]} sources 
     */
    matrixConnect(matrixNode, targetID, sources) {
        return this.matrixOPeration(matrixNode, targetID,sources, ember.MatrixOperation.connect)
    }

    /**
     * 
     * @param {Matrix} matrixNode 
     * @param {number} targetID 
     * @param {number[]} sources 
     */
    matrixDisconnect(matrixNode, targetID, sources) {
        return this.matrixOPeration(matrixNode, targetID,sources, ember.MatrixOperation.disconnect)
    }
    
    /**
     * 
     * @param {Matrix} matrixNode 
     * @param {number} targetID 
     * @param {number[]} sources 
     */
    matrixSetConnection(matrixNode, targetID, sources) {
        return this.matrixOPeration(matrixNode, targetID,sources, ember.MatrixOperation.absolute)
    }  
    
    /**
     * 
     * @param {function} f 
     */
    saveTree(f) {
        const writer = new BER.Writer();
        this.root.encode(writer);
        f(writer.buffer);
    }

    /**
     * 
     * @param {TreeNode} node 
     * @param {string|number} value
     * @returns {Promise<TreeNode>}
     */
    setValue(node, value) {
        return new Promise((resolve, reject) => {
            if (!node.isParameter()) {
                reject(new Errors.EmberAccessError('not a Parameter'));
            }
            else {
                this.addRequest({node: node, func: error => {
                    if (error) {
                        this._finishRequest();
                        reject(error);
                        return;
                    }
    
                    this._callback = (error, node) => {
                        this._finishRequest();
                        this._callback = null;
                        if (error) {
                            reject(error);
                        }
                        else {
                            
                            resolve(node);
                        }
                    };
                        winston.debug('setValue sending ...', node.getPath(), value);
                    this._client.sendBERNode(node.setValue(value));
                }});
            }
        });
    }

    /**
     * 
     * @param {TreeNode} qnode 
     * @param {function} callback 
     */
    subscribe(qnode, callback) {
        if ((qnode.isParameter() || qnode.isMatrix()) && qnode.isStream()) {
            if (qnode == null) {
                this.root.clear();
                qnode = this.root;
            }
            return new Promise((resolve, reject) => {
                this.addRequest({node: qnode, func: error => {
                    if (error != null) {
                        return reject(error);
                    }         
                    winston.debug("Sending subscribe", qnode);
                    this._client.sendBERNode(qnode.subscribe(callback));
                    this._finishRequest();
                    resolve();
                }});
            });
        } else {
            qnode.addCallback(callback);
        }
    }

    /**
     * 
     * @param {TreeNode} qnode 
     * @param {function} callback 
     */
    unsubscribe(qnode, callback) {
        if (qnode.isParameter() && qnode.isStream()) {
            return new Promise((resolve, reject) => {
                this.addRequest({node: qnode, func: (error) => {  
                    if (error != null) {
                        return reject(error);
                    }            
                    winston.debug("Sending subscribe", qnode);
                    this._client.sendBERNode(qnode.unsubscribe(callback));
                    this._finishRequest();
                    resolve();
                }});
            });
        }        
    }
}

function isDirectSubPathOf(path, parent) {
    return path === parent || (path.lastIndexOf('.') === parent.length && path.startsWith(parent));
}

module.exports = EmberClient;

