"use strict";
const QualifiedHandlers = require("./QualifiedHandlers");
const EmberLib = require('../EmberLib');
const ServerEvents = require("./ServerEvents");
const Errors = require("../Errors");
const winston = require("winston");

class ElementHandlers extends QualifiedHandlers{
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
     * @param {TreeNode} root 
     * @param {Command} cmd
     */
    handleCommand(client, element, cmd) {  
        let identifier = "root"
        if (!element.isRoot()) {
            const node = this.server.tree.getElementByPath(element.getPath());
            identifier = node == null || node.contents == null || node.contents.identifier == null ? "unknown" : node.contents.identifier;
        }
        const src = client == null ? "local" : `${client.socket.remoteAddress}:${client.socket.remotePort}`;
        switch(cmd.number) {
            case EmberLib.COMMAND_GETDIRECTORY:
                this.server.emit("event", ServerEvents.GETDIRECTORY(identifier, element.getPath(), src));
                this.handleGetDirectory(client, element);
                break;
            case EmberLib.COMMAND_SUBSCRIBE:
                this.server.emit("event", ServerEvents.SUBSCRIBE(identifier, element.getPath(), src));
                this.handleSubscribe(client, element);
                break;
            case EmberLib.COMMAND_UNSUBSCRIBE:
                this.server.emit("event", ServerEvents.UNSUBSCRIBE(identifier, element.getPath(), src));
                this.handleUnSubscribe(client, element);
                break;
            case EmberLib.COMMAND_INVOKE:                
                this.server.emit("event", ServerEvents.INVOKE(identifier, element.getPath(), src));
                this.handleInvoke(client, cmd.invocation, element);
                break;
            default:
                this.server.emit("error", new Errors.InvalidCommand(cmd.number));
                return;
        }        
    }

    /**
     * 
     * @param {S101Client} client 
     * @param {TreeNode} root 
     */
    handleGetDirectory(client, element) {
        if (client != null) {
            if ((element.isMatrix() || element.isParameter()) &&
                (!element.isStream())) {
                // ember spec: parameter without streamIdentifier should
                // report their value changes automatically.
                this.server.subscribe(client, element);
            }
            else if (element.isNode()) {
                const children = element.getChildren();
                if (children != null) {
                    for (let i = 0; i < children.length; i++) {
                        const child = children[i];
                        if ((child.isMatrix() || child.isParameter()) &&
                            (!child.isStream())) {
                            this.server.subscribe(client, child);
                        }
                    }
                }
            }
    
            const res = this.server.getQualifiedResponse(element);
            winston.debug("getDirectory response", res);
            client.sendBERNode(res);
        }
    }

    /**
     * 
     * @param {S101Client} client 
     * @param {Invocation} invocation
     * @param {TreeNode} element 
     */
    handleInvoke(client, invocation, element) {
        const result = new EmberLib.InvocationResult();
        result.invocationId = invocation.id;
        if (element == null || !element.isFunction()) {
            result.setFailure();        
        }
        else {
            try {        
                result.setResult(element.func(invocation.arguments));
            }
            catch(e){
                this.server.emit("error", e);
                result.setFailure();
            }
        }
        const res = new EmberLib.Root();
        res.addResult(result);
        client.sendBERNode(res);
    }

    
    /**
     * 
     * @param {S101Client} client 
     * @param {TreeNode} root 
     */
    handleNode(client, node) {
        // traverse the tree
        let element = node;
        let path = [];
        while(element != null) {
            if (element.isCommand()) {
                break;
            }
            if (element.number == null) {
                this.server.emit("error", new Errors.MissingElementNumber());
                return;
            }
            
            path.push(element.number);
    
            const children = element.getChildren();
            if ((! children) || (children.length === 0)) {
                break;
            }
            element = children[0];
        }
        let cmd = element;
    
        if (cmd == null) {
            this.server.emit("error", new Errors.InvalidRequest());
            this.server.handleError(client);
            return path;
        }  
    
        element = this.server.tree.getElementByPath(path.join("."));
        
        if (element == null) {
            this.server.emit("error", new Errors.UnknownElement(path.join(".")));
            return this.server.handleError(client);
        }
        if (cmd.isCommand()) {
            this.handleCommand(client, element, cmd);
            return path;
        } else if ((cmd.isMatrix()) && (cmd.connections != null)) {
            this.handleMatrixConnections(client, element, cmd.connections);
        }
        else if ((cmd.isParameter()) &&
            (cmd.contents != null) && (cmd.contents.value != null)) {
            winston.debug(`setValue for element at path ${path} with value ${cmd.contents.value}`); 
            this.server.setValue(element, cmd.contents.value, client);
            const res = this.server.getResponse(element);
            client.sendBERNode(res)
            this.server.updateSubscribers(element.getPath(), res, client);
        }
        else {
            this.server.emit("error", new Errors.InvalidRequesrFormat(path.join(".")));
            winston.debug("invalid request format"); 
            return this.server.handleError(client, element.getTreeBranch());
        }
        // for logging purpose, return the path.
        return path;
    }

    /**
     * 
     * @param {S101Client} client 
     * @param {TreeNode} root 
     */
    handleSubscribe(client, element) {
        winston.debug("subscribe", element);
        this.server.subscribe(client, element);
    }

    /**
     * 
     * @param {S101Client} client 
     * @param {TreeNode} root 
     */
    handleUnSubscribe(client, element) {
        winston.debug("unsubscribe", element);
        this.server.unsubscribe(client, element);
    }
}

module.exports = ElementHandlers;