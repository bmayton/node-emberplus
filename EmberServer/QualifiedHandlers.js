"use strict";
const MatrixHandlers = require("./MatrixHandlers");
const Errors = require("../errors");

class QualifiedHandlers extends MatrixHandlers {
    /**
     * 
     * @param {EmberServer} server 
     */
    constructor(server) {
        super(server);
    }

     /**
     * 
     * @param {S101Client} client 
     * @param {TreeNode} element
     * @param {QualifiedMatrix} matrix
     */
    handleQualifiedMatrix(client, element, matrix)
    {
        this.handleMatrixConnections(client, element, matrix.connections);
    }

    /**
     * 
     * @param {S101Client} client 
     * @param {QualifiedNode} root 
     */
    handleQualifiedNode(client, node) {
        const path = node.path;
        // Find this element in our tree
        const element = this.server.tree.getElementByPath(path);
    
        if (element == null) {
            this.server.emit("error", new Errors.UnknownElement(path));
            return this.server.handleError(client);
        }
        
        if (node.hasChildren()) {
            for(let child of node.children) {
                if (child.isCommand()) {
                    this.handleCommand(client, element, child);
                }
                break;
            }
        }
        else {
            if (node.isMatrix()) {
                this.handleQualifiedMatrix(client, element, node);
            }
            else if (node.isParameter()) {
                this.handleQualifiedParameter(client, element, node);
            }        
        }
        return path;
    }

    /**
     * 
     * @param {S101Client} client 
     * @param {TreeNode} element
     * @param {QualifiedParameter} parameter
     */
    handleQualifiedParameter(client, element, parameter)
    {
        if (parameter.contents.value != null) {
            this.server.setValue(element, parameter.contents.value, client);
            let res = this.server.getQualifiedResponse(element);
            client.sendBERNode(res)
            this.server.updateSubscribers(element.getPath(), res, client);
        }
    }
}

module.exports = QualifiedHandlers;
