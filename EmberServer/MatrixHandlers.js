"use strict";
const ember = require('../EmberLib');
const ServerEvents = require("./ServerEvents");
const winston = require("winston");

class MatrixHandlers {
     /**
     * 
     * @param {EmberServer} server 
     */
    constructor(server) {
        this.server = server;
    }

    /**
     * 
     * @param {Matrix} matrix 
     * @param {number} targetID 
     */
    getDisconnectSource(matrix, targetID) {
        if (matrix.defaultSources) {
            return matrix.defaultSources[targetID].contents.value;
        }
        if (matrix.contents.labels == null || matrix.contents.labels.length == 0) {
            return null;
        }
        const basePath = matrix.contents.labels[0].basePath;
        const labels = this.server.tree.getElementByPath(basePath);
        const number = labels.getNumber() + 1;
        const parent = labels.getParent();
        const children = parent.getChildren();
        for(let child of children) {
            if (child.getNumber() === number) {
                matrix.defaultSources = child.getChildren();
                return matrix.defaultSources[targetID].contents.value;
            }
        }
        return null;
    }

    /**
     * 
     * @param {S101Client} client 
     * @param {Matrix} matrix
     * @param {Object<string,MatrixConnection>} connections 
     * @param {boolean} response=true
     */
    handleMatrixConnections(client, matrix, connections, response = true) {
        let res,conResult;
        let root; // ember message root
        winston.debug("Handling Matrix Connection");
        if (client != null && client.request.isQualified()) {
            root = new ember.Root();
            res = new ember.QualifiedMatrix(matrix.getPath());
            //root.elements = [res]; // do not use addchild or the element will get removed from the tree.
            root.addElement(res);
        }
        else {
            res = new ember.MatrixNode(matrix.number);
            root = matrix._parent.getTreeBranch(res);
        }    
        res.connections = {};
        for(let id in connections) {        
            if (!connections.hasOwnProperty(id)) {
                continue;
            }
            let connection = connections[id];
            const src = client == null ? "local" : `${client.socket.remoteAddress}:${client.socket.remotePort}`;
            this.server.emit("event", ServerEvents.MATRIX_CONNECTION(
                matrix.contents.identifier,matrix.getPath(),src,id,connection.sources
            ));
            conResult = new ember.MatrixConnection(connection.target);
            let emitType;
            res.connections[connection.target] = conResult;
            
            if (matrix.connections[connection.target].isLocked()) {
                conResult.disposition = ember.MatrixDisposition.locked;
            }
            else if (matrix.contents.type !== ember.MatrixType.nToN && 
                connection.operation !== ember.MatrixOperation.disconnect &&
                connection.sources != null && connection.sources.length === 1) {
                if (matrix.contents.type === ember.MatrixType.oneToOne) {
                    // if the source is being used already, disconnect it.
                    const targets = matrix.getSourceConnections(connection.sources[0]);
                    if (targets.length === 1 && targets[0] !== connection.target) {
                        const disconnect = new ember.MatrixConnection(targets[0]);
                        disconnect.setSources([]);
                        disconnect.disposition = ember.MatrixDisposition.modified;
                        res.connections[targets[0]] = disconnect;
                        matrix.setSources(targets[0], []);
                        if (response) {
                            this.server.emit("matrix-disconnect", {
                                target: targets[0],
                                sources: connection.sources,
                                client: client == null ? null : client.remoteAddress()
                            });
                        }
                    }
                }
                // if the target is connected already, disconnect it
                if (matrix.connections[connection.target].sources != null && 
                    matrix.connections[connection.target].sources.length === 1) {
                    if (matrix.contents.type === ember.MatrixType.oneToN) {
                        const disconnectSource = this.getDisconnectSource(matrix, connection.target);
                        if (matrix.connections[connection.target].sources[0] == connection.sources[0]) {
                            if (disconnectSource != null && disconnectSource != -1 &&
                                disconnectSource != connection.sources[0]) {
                                connection.sources = [disconnectSource];
                            }
                            else {
                                // do nothing
                                connection.operarion = ember.MatrixOperation.tally;
                            }
                        }
                    }
                    if (matrix.connections[connection.target].sources[0] !== connection.sources[0]) {
                        const source = matrix.connections[connection.target].sources[0];
                        matrix.setSources(connection.target, []);
                        if (response) {
                            this.server.emit("matrix-disconnect", {
                                target: connection.target,
                                sources: [source],
                                client: client == null ? null : client.remoteAddress()
                            });
                        }
                    }
                    else if (matrix.contents.type === ember.MatrixType.oneToOne) {
                        // let's change the request into a disconnect
                        connection.operation = ember.MatrixOperation.disconnect;
                    }
                }
            }
            
            if (connection.operation !== ember.MatrixOperation.disconnect &&
                connection.sources != null && connection.sources.length > 0 &&
                matrix.canConnect(connection.target,connection.sources,connection.operation)) {
                // Apply changes
                if ((connection.operation == null) ||
                    (connection.operation.value == ember.MatrixOperation.absolute)) {
                    matrix.setSources(connection.target, connection.sources);
                    emitType = "matrix-change";
                }
                else if (connection.operation == ember.MatrixOperation.connect) {
                    matrix.connectSources(connection.target, connection.sources);
                    emitType = "matrix-connect";
                }
                conResult.disposition = ember.MatrixDisposition.modified;
            }
            else if (connection.operation !== ember.MatrixOperation.disconnect &&
                connection.sources != null && connection.sources.length === 0 &&
                matrix.connections[connection.target].sources != null && 
                matrix.connections[connection.target].sources.length > 0) {
                // let's disconnect
                if (response) {
                    this.server.emit("matrix-disconnect", {
                        target: connection.target,
                        sources: matrix.connections[connection.target].sources,
                        client: client == null ? null : client.remoteAddress()
                    });
                }
                matrix.setSources(connection.target, []);
                conResult.disposition = ember.MatrixDisposition.modified;
            }
            else if (connection.operation === ember.MatrixOperation.disconnect &&
                matrix.connections[connection.target].sources != null &&
                matrix.connections[connection.target].sources.length > 0) { 
                // Disconnect            
                if (matrix.contents.type === ember.MatrixType.oneToN) {
                    const disconnectSource = this.getDisconnectSource(matrix, connection.target);
                    if (matrix.connections[connection.target].sources[0] == connection.sources[0]) {
                        if (disconnectSource != null && disconnectSource != -1 &&
                            disconnectSource != connection.sources[0]) {
                            if (response) {
                                this.server.emit("matrix-disconnect", {
                                    target: connection.target,
                                    sources: matrix.connections[connection.target].sources,
                                    client: client == null ? null : client.remoteAddress()
                                });
                            }
                            matrix.setSources(connection.target, [disconnectSource]);
                            connection.operarion = ember.MatrixOperation.modified;
                        }
                        else {
                            // do nothing
                            connection.operarion = ember.MatrixOperation.tally;
                        }
                    }
                }
                else {
                    matrix.disconnectSources(connection.target, connection.sources);
                    conResult.disposition = ember.MatrixDisposition.modified;
                    emitType = "matrix-disconnect";
                }
            }
            else if (conResult.disposition !== ember.MatrixDisposition.locked){
                winston.debug(`Invalid Matrix operation ${connection.operarion} on target ${connection.target} with sources ${JSON.stringify(connection.sources)}`);
                conResult.disposition = ember.MatrixDisposition.tally;
            }
    
            // Send response or update subscribers.
            conResult.sources = matrix.connections[connection.target].sources;
            if (response) {            
                // We got a request so emit something.
                this.server.emit(emitType, {
                    target: connection.target,
                    sources: connection.sources,
                    client: client == null ? null : client.remoteAddress()
                });
            }       
        }
        if (client != null) {
            client.sendBERNode(root);
        }
    
        if (conResult != null && conResult.disposition !== ember.MatrixDisposition.tally) {
            winston.debug("Updating subscribers for matrix change");
            this.server.updateSubscribers(matrix.getPath(), root, client);
        }
    }

}

module.exports = MatrixHandlers;