const EventEmitter = require('events').EventEmitter;
const util = require('util');
const S101Client = require('./client.js').S101Socket;
const ember = require('./ember.js');
const BER = require('./ber.js');
const errors = require('./errors.js');


function DeviceTree(host, port = 9000) {
    DeviceTree.super_.call(this);
    var self = this;
    self._debug = false;
    self.timeoutValue = 3000;
    self.client = new S101Client(host, port);
    self.root = new ember.Root();
    self.pendingRequests = [];
    self.activeRequest = null;
    self.timeout = null;
    self.callback = undefined;
    self.requestID = 0;

    self.client.on('connecting', () => {
        self.emit('connecting');
    });

    self.client.on('connected', () => {
        self.emit('connected');
        if (self.callback !== undefined) {
            self.callback();
        }
    });

    self.client.on('disconnected', () => {
        self.emit('disconnected');
    });

    self.client.on("error", (e) => {
        if (self.callback !== undefined) {
            self.callback(e);
        }
        self.emit("error", e);
    });

    self.client.on('emberTree', (root) => {
        try {
            if (root instanceof ember.InvocationResult) {
                self.emit('invocationResult', root);
                if (self._debug) {
                    console.log("Received InvocationResult", root);
                }
            } else {
                self.handleRoot(root);
                if (self._debug) {
                    console.log("Received root", root);
                }
            }
            if (self.callback) {
                self.callback(undefined, root);
            }
        }
        catch(e) {
            if (self._debug) {
                console.log(e, root);
            }
            if (self.callback) {
                self.callback(e);
            }
        }
    });
}

util.inherits(DeviceTree, EventEmitter);


var DecodeBuffer = function (packet) {
    var ber = new BER.Reader(packet);
    return ember.Root.decode(ber);
};

DeviceTree.prototype.saveTree = function (f) {
    var writer = new BER.Writer();
    this.root.encode(writer);
    f(writer.buffer);
};

DeviceTree.prototype.isConnected = function () {
    return ((this.client !== undefined) && (this.client.isConnected()));
};

DeviceTree.prototype.connect = function (timeout = 2) {
    return new Promise((resolve, reject) => {
        this.callback = (e) => {
            this.callback = undefined;
            if (e === undefined) {
                return resolve();
            }
            return reject(e);
        };
        if ((this.client !== undefined) && (this.client.isConnected())) {
            this.client.disconnect();
        }
        this.client.connect(timeout);
    });
};

DeviceTree.prototype.expand = function (node) {
    let self = this;
    if (node == null) {
        return Promise.reject(new Error("Invalid null node"));
    }
    if (node.isParameter() || node.isMatrix() || node.isFunction()) {
        return self.getDirectory(node);
    }    
    return self.getDirectory(node).then((res) => {
        let children = node.getChildren();
        if ((res === undefined) || (children === undefined) || (children === null)) {
            if (self._debug) {
                console.log("No more children for ", node);
            }
            return;
        }
        let p = Promise.resolve();
        for (let child of children) {
            if (child.isParameter()) {
                // Parameter can only have a single child of type Command.
                continue;
            }
            if (self._debug) {
                console.log("Expanding child", child);
            }
            p = p.then(() => {
                return self.expand(child).catch((e) => {
                    // We had an error on some expansion
                    // let's save it on the child itself
                    child.error = e;
                });
            });
        }
        return p;
    });
};

function isDirectSubPathOf(path, parent) {
    return path === parent || (path.lastIndexOf('.') === parent.length && path.startsWith(parent));
}

DeviceTree.prototype.getDirectory = function (qnode) {
    var self = this;
    if (qnode == null) {
        self.root.clear();
        qnode = self.root;
    }
    return new Promise((resolve, reject) => {
        self.addRequest({node: qnode, func: (error) => {
            if (error) {
                self.finishRequest();
                reject(error);
                return;
            }

            self.callback = (error, node) => {
                const requestedPath = qnode.getPath();
                if (node == null) { 
                    if (self._debug) {
                        console.log(`received null response for ${requestedPath}`);
                    }
                    return; 
                }
                if (error) {
                    if (self._debug) {
                        console.log("Received getDirectory error", error);
                    }
                    self.clearTimeout(); // clear the timeout now. The resolve below may take a while.
                    self.finishRequest();
                    reject(error);
                    return;
                }
                if (qnode instanceof ember.Root) {
                    if (qnode.elements == null || qnode.elements.length === 0) {
                        if (self._debug) {
                            console.log("getDirectory response", node);
                        }
                        return self.callback(new Error("Invalid qnode for getDirectory"));
                    }

                    const nodeElements = node == null ? null : node.elements;

                    if (nodeElements != null
                        && nodeElements.every(el => el._parent instanceof ember.Root)) {
                        if (self._debug) {
                            console.log("Received getDirectory response", node);
                        }
                        self.clearTimeout(); // clear the timeout now. The resolve below may take a while.
                        self.finishRequest();
                        resolve(node); // make sure the info is treated before going to next request.
                    }
                    else {
                        return self.callback(new Error(`Invalid response for getDirectory ${requestedPath}`));
                    }
                } else {                    
                    const nodeElements = node == null ? null : node.elements;
                    if (nodeElements != null &&
                        ((qnode.isMatrix() && nodeElements.length === 1 && nodeElements[0].getPath() === requestedPath) ||
                         (!qnode.isMatrix() && nodeElements.every(el => isDirectSubPathOf(el.getPath(), requestedPath))))) {
                        if (self._debug) {
                            console.log("Received getDirectory response", node);
                        }
                        self.clearTimeout(); // clear the timeout now. The resolve below may take a while.
                        self.finishRequest();
                        resolve(node); // make sure the info is treated before going to next request.
                    }
                    else if (self._debug) {
                        console.log(node);
                        console.log(new Error(requestedPath));
                    }
                }
            };

            if (self._debug) {
                console.log("Sending getDirectory", qnode);
            }
            self.client.sendBERNode(qnode.getDirectory());
        }});
    });
};

DeviceTree.prototype.matrixOPeration = function(matrixNode, targetID, sources, operation = ember.MatrixOperation.connect) {
    return new Promise((resolve, reject) => {
        if (!Array.isArray(sources)) {
            return reject(new Error("Sources should be an array"));
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
                this.finishRequest();
                reject(error);
                return;
            }

            this.callback = (error, node) => {
                const requestedPath = matrixNode.getPath();
                if (node == null) { 
                    if (this._debug) {
                        console.log(`received null response for ${requestedPath}`);
                    }
                    return; 
                }
                if (error) {
                    if (this._debug) {
                        console.log("Received getDirectory error", error);
                    }
                    this.clearTimeout(); // clear the timeout now. The resolve below may take a while.
                    this.finishRequest();
                    reject(error);
                    return;
                }
                let matrix = null;
                if (node != null) {
                    matrix = node.elements[0];
                }
                if (matrix != null && matrix.isMatrix() && matrix.getPath() === requestedPath) {
                    this.clearTimeout(); // clear the timeout now. The resolve below may take a while.
                    this.finishRequest();
                    resolve(matrix);
                }
                else {
                    if (this._debug) {
                        console.log(`unexpected node response during matrix connect ${requestedPath}`, 
                        JSON.stringify(matrix.toJSON(), null, 4));
                    }
                }
            }
            this.client.sendBERNode(matrixNode.connect(connections));
        }});
    });
}

DeviceTree.prototype.matrixConnect = function(matrixNode, targetID, sources) {
    return this.matrixOPeration(matrixNode, targetID,sources, ember.MatrixOperation.connect)
}

DeviceTree.prototype.matrixDisconnect = function(matrixNode, targetID, sources) {
    return this.matrixOPeration(matrixNode, targetID,sources, ember.MatrixOperation.disconnect)
}

DeviceTree.prototype.matrixSetConnection = function(matrixNode, targetID, sources) {
    return this.matrixOPeration(matrixNode, targetID,sources, ember.MatrixOperation.absolute)
}

DeviceTree.prototype.invokeFunction = function (fnNode, params) {
    var self = this;
    return new Promise((resolve, reject) => {
        self.addRequest({node: fnNode, func: (error) => {
            if (error) {
                reject(error);
                self.finishRequest();
                return;
            }

            let cb = (error, result) => {
                self.clearTimeout();
                if (error) {
                    reject(error);
                }
                else {
                    if (self._debug) {
                        console.log("InvocationResult", result);
                    }
                    resolve(result);
                }
                // cleaning callback and making next request.
                self.finishRequest();
            };

            if (self._debug) {
                console.log("Invocking function", fnNode);
            }
            self.callback = cb;
            self.client.sendBERNode(fnNode.invoke(params));
        }});
    })
};

DeviceTree.prototype.disconnect = function () {
    if (this.client !== undefined) {
        return this.client.disconnect();
    }
};

DeviceTree.prototype.makeRequest = function () {
    var self = this;
    if (self.activeRequest === null && self.pendingRequests.length > 0) {
        self.activeRequest = self.pendingRequests.shift();

        const t = function (id) {
            var path = self.activeRequest.path == null ?
                self.activeRequest.node.getPath() :
                self.activeRequest.path;
            var req = `${id} - ${path}`;
            if (self._debug) {                
                console.log(`Making request ${req}`, Date.now());
            }
            self.timeout = setTimeout(() => {
                self.timeoutRequest(req);
            }, self.timeoutValue);
        };

        t(self.requestID++);
        self.activeRequest.func();
    }
};

DeviceTree.prototype.addRequest = function (req) {
    var self = this;
    self.pendingRequests.push(req);
    self.makeRequest();
};

DeviceTree.prototype.clearTimeout = function () {
    if (this.timeout != null) {
        clearTimeout(this.timeout);
        this.timeout = null;
    }
};

DeviceTree.prototype.finishRequest = function () {
    var self = this;
    self.callback = undefined;
    self.clearTimeout();
    self.activeRequest = null;
    try {
        self.makeRequest();
    } catch(e) {
        if (self._debug) {console.log(e);}
        if (self.callback != null) {
            self.callback(e);
        }
        self.emit("error", e);
    }
};

DeviceTree.prototype.timeoutRequest = function (id) {
    var self = this;
    self.root.cancelCallbacks();
    self.activeRequest.func(new errors.EmberTimeoutError(`Request ${id !== undefined ? id : ""} timed out`));
};

DeviceTree.prototype.handleRoot = function (root) {
    var self = this;

    if (self._debug) {
        console.log("handling root", JSON.stringify(root));
    }
    var callbacks = self.root.update(root);
    if (root.elements !== undefined) {
        for (var i = 0; i < root.elements.length; i++) {
            if (root.elements[i].isQualified()) {
                callbacks = callbacks.concat(this.handleQualifiedNode(this.root, root.elements[i]));
            }
            else {
                callbacks = callbacks.concat(this.handleNode(this.root, root.elements[i]));
            }
        }

        // Fire callbacks once entire tree has been updated
        for (var j = 0; j < callbacks.length; j++) {
            //console.log('hr cb');
            callbacks[j]();
        }
    }
};

DeviceTree.prototype.handleQualifiedNode = function (parent, node) {
    var self = this;
    var callbacks = [];
    var element = parent.getElementByPath(node.path);
    if (element !== null) {
        self.emit("value-change", node);
        callbacks = element.update(node);
    }
    else {
        var path = node.path.split(".");
        if (path.length === 1) {
            this.root.addChild(node);
        }
        else {
            // Let's try to get the parent
            path.pop();
            parent = this.root.getElementByPath(path.join("."));
            if (parent === null) {
                return callbacks;
            }
            parent.addChild(node);
	    callbacks = parent.update(parent);
        }
        element = node;
    }

    var children = node.getChildren();
    if (children !== null) {
        for (var i = 0; i < children.length; i++) {
            if (children[i].isQualified()) {
                callbacks = callbacks.concat(this.handleQualifiedNode(element, children[i]));
            }
            else {
                callbacks = callbacks.concat(this.handleNode(element, children[i]));
            }
        }
    }

    return callbacks;
};

DeviceTree.prototype.handleNode = function (parent, node) {
    var self = this;
    var callbacks = [];

    var n = parent.getElementByNumber(node.getNumber());
    if (n === null) {
        parent.addChild(node);
        n = node;
    } else {
        callbacks = n.update(node);
    }

    var children = node.getChildren();
    if (children !== null) {
        for (var i = 0; i < children.length; i++) {
            callbacks = callbacks.concat(this.handleNode(n, children[i]));
        }
    }
    else {
        self.emit("value-change", node);
    }

    return callbacks;
};

DeviceTree.prototype.getNodeByPathnum = function (path) {
    var self = this;
    if (typeof path === 'string') {
        path = path.split('.');
    }
    var pos = 0;
    var lastMissingPos = -1;
    var currentNode = this.root;
    const getNext = () => {
        return Promise.resolve()
        .then(() => {
            const children = currentNode.getChildren();
            const number = Number(path[pos]);
            if (children != null) {
                for (let i = 0; i < children.length; i++) {
                    var node = children[i];
                    if (node.getNumber() === number) {
                        // We have this part already.
                        pos++;
                        if (pos >= path.length) {
                            return node;
                        }
                        currentNode = node;                   
                        return getNext();
                    }
                }
            }
            // We do not have that node yet.
            if (lastMissingPos === pos) {
                throw new Error(`Failed path discovery at ${path.slice(0, pos).join("/")}`);
            }
            lastMissingPos = pos;
            return this.getDirectory(currentNode).then(() => getNext());
        });
    }
    return getNext();
};

DeviceTree.prototype.getNodeByPath = function (path) {
    var self = this;
    if (typeof path === 'string') {
        path = path.split('/');
    }
    var pos = 0;
    var lastMissingPos = -1;
    var currentNode = this.root;
    const getNext = () => {
        return Promise.resolve()
        .then(() => {
            const children = currentNode.getChildren();
            const identifier = path[pos];
            if (children != null) {
                for (let i = 0; i < children.length; i++) {
                    var node = children[i];
                    if (node.contents != null && node.contents.identifier === identifier) {
                        // We have this part already.
                        pos++;
                        if (pos >= path.length) {
                            return node;
                        }
                        currentNode = node;                   
                        return getNext();
                    }
                }
            }
            // We do not have that node yet.
            if (lastMissingPos === pos) {
                throw new Error(`Failed path discovery at ${path.slice(0, pos + 1).join("/")}`);
            }
            lastMissingPos = pos;
            return this.getDirectory(currentNode).then(() => getNext());
        });
    }
    return getNext();
};

DeviceTree.prototype.subscribe = function (qnode, callback) {
    if (qnode.isParameter() && qnode.isStream()) {
        var self = this;
        if (qnode == null) {
            self.root.clear();
            qnode = self.root;
        }
        return new Promise((resolve, reject) => {
            self.addRequest({node: qnode, func: (error) => {              
                if (self._debug) {
                    console.log("Sending subscribe", qnode);
                }
                self.client.sendBERNode(qnode.subscribe(callback));
                self.finishRequest();
                resolve();
            }});
        });
    } else {
        node.addCallback(callback);
    }
};

DeviceTree.prototype.unsubscribe = function (qnode, callback) {
    if (qnode.isParameter() && qnode.isStream()) {
        var self = this;
        if (qnode == null) {
            self.root.clear();
            qnode = self.root;
        }
        return new Promise((resolve, reject) => {
            self.addRequest({node: qnode, func: (error) => {              
                if (self._debug) {
                    console.log("Sending subscribe", qnode);
                }
                self.client.sendBERNode(qnode.unsubscribe(callback));
                self.finishRequest();
                resolve();
            }});
        });
    }
};

DeviceTree.prototype.setValue = function (node, value) {
    var self = this;
    return new Promise((resolve, reject) => {
        if ((!(node instanceof ember.Parameter)) &&
            (!(node instanceof ember.QualifiedParameter))) {
            reject(new errors.EmberAccessError('not a property'));
        }
        else {
            // if (this._debug) { console.log('setValue', node.getPath(), value); }
            self.addRequest({node: node, func: (error) => {
                if (error) {
                    self.finishRequest();
                    reject(error);
                    return;
                }

                let cb = (error, node) => {
                    //console.log('setValue complete...', node.getPath(), value);
                    self.finishRequest();
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(node);
                    }
                };

                self.callback = cb;
                if (this._debug) {
                    console.log('setValue sending ...', node.getPath(), value);
                }
                self.client.sendBERNode(node.setValue(value));
            }});
        }
    });
};

function TreePath(path) {
    this.identifiers = [];
    this.numbers = [];

    if (path !== undefined) {
        for (var i = 0; i < path.length; i++) {
            if (Number.isInteger(path[i])) {
                this.numbers.push(path[i]);
                this.identifiers.push(null);
            } else {
                this.identifiers.push(path[i]);
                this.numbers.push(null);
            }
        }
    }
}


module.exports = { DeviceTree, DecodeBuffer };
