"use strict";
const QualifiedHandlers = require("./QualifiedHandlers");
const ember = require('../EmberLib');

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
        switch(cmd.number) {
            case ember.COMMAND_GETDIRECTORY:
                this.handleGetDirectory(client, element);
                break;
            case ember.COMMAND_SUBSCRIBE:
                this.handleSubscribe(client, element);
                break;
            case ember.COMMAND_UNSUBSCRIBE:
                this.handleUnSubscribe(client, element);
                break;
            case ember.COMMAND_INVOKE:
                this.handleInvoke(client, cmd.invocation, element);
                break;
            default:
                this.server.emit("error", new Error(`invalid command ${cmd.number}`));
                break;
        }
    }

    /**
     * 
     * @param {S101Client} client 
     * @param {TreeNode} root 
     */
    handleGetDirectory(client, element) {
        if (client !== undefined) {
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
            if (this.server._debug) {
                console.log("getDirectory response", res);
            }
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
        const result = new ember.InvocationResult();
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
        const res = new ember.Root();
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
        while(element !== undefined) {
            if (element.number == null) {
                this.server.emit("error", "invalid request");
                return;
            }
            if (element.isCommand()) {
                break;
            }
            path.push(element.number);
    
            let children = element.getChildren();
            if ((! children) || (children.length === 0)) {
                break;
            }
            element = element.children[0];
        }
        let cmd = element;
    
        if (cmd == null) {
            this.server.emit("error", "invalid request");
            return this.server.handleError(client);
        }
    
        element = this.server.tree.getElementByPath(path.join("."));
    
        if (element == null) {
            this.server.emit("error", new Error(`unknown element at path ${path}`));
            return this.server.handleError(client);
        }
    
        if (cmd.isCommand()) {
            this.handleCommand(client, element, cmd);
        }
        else if ((cmd.isCommand()) && (cmd.connections !== undefined)) {
            this.handleMatrixConnections(client, element, cmd.connections);
        }
        else if ((cmd.isParameter()) &&
            (cmd.contents !== undefined) && (cmd.contents.value !== undefined)) {
            if (this.server._debug) { console.log(`setValue for element at path ${path} with value ${cmd.contents.value}`); }
            this.setValue(element, cmd.contents.value, client);
            let res = this.server.getResponse(element);
            client.sendBERNode(res)
            this.server.updateSubscribers(element.getPath(), res, client);
        }
        else {
            this.server.emit("error", new Error("invalid request format"));
            if (this.server._debug) { console.log("invalid request format"); }
            return this.server.handleError(client, element.getTreeBranch());
        }
        return path;
    }

    /**
     * 
     * @param {S101Client} client 
     * @param {TreeNode} root 
     */
    handleSubscribe(client, element) {
        if (this.server._debug) {
            console.log("subscribe");
        }
        this.server.subscribe(client, element);
    }

    /**
     * 
     * @param {S101Client} client 
     * @param {TreeNode} root 
     */
    handleUnSubscribe(client, element) {
        if (this.server._debug) {
            console.log("unsubscribe");
        }
        this.server.unsubscribe(client, element);
    }
}

module.exports = ElementHandlers;