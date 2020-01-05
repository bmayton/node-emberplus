"use strict";

const TreeNode = require("./TreeNode");
const FunctionContent = require("./FunctionContent");
const {COMMAND_GETDIRECTORY, COMMAND_SUBSCRIBE, COMMAND_UNSUBSCRIBE} = require("./constants");
const BER = require('../ber.js');
const Command = require("./Command");

class QualifiedFunction extends TreeNode {
    /**
     * 
     * @param {string} path 
     * @param {function} func 
     */
    constructor(path, func) {
        super();
        this.path = path;
        this.func = func;
    }

    isFunction() {
        return true;
    }
    isQualified() {
        return true;
    }

    /**
     * 
     * @param {BER} ber 
     */
    encode(ber) {
        ber.startSequence(BER.APPLICATION(20));
    
        ber.startSequence(BER.CONTEXT(0));
        ber.writeRelativeOID(this.path, BER.EMBER_RELATIVE_OID);
        ber.endSequence(); // BER.CONTEXT(0)
    
        if(this.contents != null) {
            ber.startSequence(BER.CONTEXT(1));
            this.contents.encode(ber);
            ber.endSequence(); // BER.CONTEXT(1)
        }
    
        this.encodeChildren(ber);
    
        ber.endSequence(); // BER.APPLICATION(3)
    }

    /**
     * 
     * @param {number} cmd
     * @returns {TreeNode}
     */
    getCommand(cmd) {
        const r = new TreeNode();
        const qf = new QualifiedFunction();
        qf.path = this.getPath();
        r.addElement(qf);
        qf.addChild(new Command(cmd));
        return r;
    }

    /**
     * 
     * @returns {TreeNode}
     */
    getDirectory() {
        return this.getCommand(COMMAND_GETDIRECTORY);
    }
    
    /**
     * 
     * @param {*} params 
     */
    invoke(params) {
        if (this.path == null) {
            throw new Error("Invalid path");
        }
        var QualifiedFunctionNode = this.getCommand(COMMAND_INVOKE);
        var invocation = new Invocation()
        invocation.arguments = params;
        QualifiedFunctionNode.getElementByPath(this.getPath()).getNumber(COMMAND_INVOKE).invocation = invocation
        return QualifiedFunctionNode;
    }

    /**
     * 
     * @param {function} callback 
     * @returns {TreeNode}
     */
    subscribe(callback) {
        return this.getCommand(COMMAND_SUBSCRIBE);
    }
    
    /**
     * 
     * @param {function} callback 
     * @returns {TreeNode}
     */
    unsubscribe(callback) {
        return QualifiedFunctionCommand(COMMAND_UNSUBSCRIBE);
    }


    /**
     * 
     * @param {BER} ber 
     * @returns {QualifiedFunction}
     */
    static decode(ber) {
        const qf = new QualifiedFunction();
        ber = ber.getSequence(BER.APPLICATION(20));
        while(ber.remain > 0) {
            let tag = ber.peek();
            let seq = ber.getSequence(tag);
            if(tag == BER.CONTEXT(0)) {
                qf.path = seq.readRelativeOID(BER.EMBER_RELATIVE_OID); // 13 => relative OID
            }
            else if(tag == BER.CONTEXT(1)) {
                qf.contents = FunctionContent.decode(seq);
            } else if(tag == BER.CONTEXT(2)) {
                qf.decodeChildren(seq);
            }
            else {
                throw new errors.UnimplementedEmberTypeError(tag);
            }
        }
        return qf;
    }
}

module.exports = QualifiedFunction;