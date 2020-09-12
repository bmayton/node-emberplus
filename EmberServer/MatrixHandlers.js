"use strict";
const EmberLib = require('../EmberLib');
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
     * @return {number}
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
        return -1;
    }

    /**
     * 
     * @param {S101Client} client 
     * @param {Matrix} matrix
     * @param {Object<string,MatrixConnection>} connections 
     * @param {boolean} response=true
     */
    handleMatrixConnections(client, matrix, connections, response = true) {
        let res; // response
        let conResult;
        let root; // ember message root
        winston.debug("Handling Matrix Connection");
        if (client != null && client.request.isQualified()) {
            root = new EmberLib.Root();
            res = new EmberLib.QualifiedMatrix(matrix.getPath());
            //root.elements = [res]; // do not use addchild or the element will get removed from the tree.
            root.addElement(res);
        }
        else {
            res = new EmberLib.MatrixNode(matrix.number);
            root = matrix._parent.getTreeBranch(res);
        }    
        res.connections = {};
        for(let id in connections) {        
            if (!connections.hasOwnProperty(id)) {
                continue;
            }
            const connection = connections[id];
            const src = client == null ? "local" : `${client.socket.remoteAddress}:${client.socket.remotePort}`;
            this.server.emit("event", ServerEvents.MATRIX_CONNECTION(
                matrix.contents.identifier,matrix.getPath(),src,id,connection.sources
            ));
            conResult = new EmberLib.MatrixConnection(connection.target);
            res.connections[connection.target] = conResult;
            
            if (matrix.connections[connection.target].isLocked()) {
                conResult.disposition = EmberLib.MatrixDisposition.locked;
            }
            else {
                // Call pre-processing function
                this.server.preMatrixConnect(matrix, connection, res, client, response);
            }
            
            if (conResult.disposition == null) {
                // No decision made yet
                if (connection.operation !== EmberLib.MatrixOperation.disconnect &&
                    connection.sources != null && connection.sources.length > 0 &&
                    matrix.canConnect(connection.target,connection.sources,connection.operation)) {
                    this.server.applyMatrixConnect(matrix, connection, conResult, client, response);
                }
                else if (connection.operation !== EmberLib.MatrixOperation.disconnect &&
                    connection.sources != null && connection.sources.length === 0 &&
                    matrix.connections[connection.target].sources != null && 
                    matrix.connections[connection.target].sources.length > 0) {
                    // let's disconnect
                    conResult = this.server.disconnectMatrixTarget(
                        matrix, connection.target, 
                        matrix.connections[connection.target].sources, 
                        client, 
                        response);
                }
                else if (connection.operation === EmberLib.MatrixOperation.disconnect &&
                    matrix.connections[connection.target].sources != null &&
                    matrix.connections[connection.target].sources.length > 0) { 
                    // Disconnect            
                    if (matrix.contents.type === EmberLib.MatrixType.oneToN) {
                        this.server.applyMatrixOneToNDisconnect(matrix, connection, res, client, response);
                    }
                    else {
                        conResult = this.server.disconnectSources(matrix, connection.target, connection.sources, client, response);
                    }
                }
            }
            if (conResult.disposition == null){
                winston.debug(`Invalid Matrix operation ${connection.operation} on target ${connection.target} with sources ${JSON.stringify(connection.sources)}`);
                conResult.disposition = EmberLib.MatrixDisposition.tally;
            }
    
            // Send response or update subscribers.
            conResult.sources = matrix.connections[connection.target].sources;    
        }
        if (client != null) {
            client.sendBERNode(root);
        }
    
        if (conResult != null && conResult.disposition !== EmberLib.MatrixDisposition.tally) {
            winston.debug("Updating subscribers for matrix change");
            this.server.updateSubscribers(matrix.getPath(), root, client);
        }
    }

}

module.exports = MatrixHandlers;
