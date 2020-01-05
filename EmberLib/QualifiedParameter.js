"use strict";

const TreeNode = require("./TreeNode");
const {COMMAND_GETDIRECTORY, COMMAND_SUBSCRIBE, COMMAND_UNSUBSCRIBE} = require("./constants");
const ParameterContents = require("./ParameterContents");
const BER = require('../ber.js');
const Command = require("./Command");


class QualifiedParameter extends TreeNode {
    /**
     * 
     * @param {string} path 
     */
    constructor(path) {
        super();
        this.path = path;
    }

    isParameter() {
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
        ber.startSequence(BER.APPLICATION(9));    
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
        const qp = new QualifiedParameter();
        qp.path = this.getPath();
        r.addElement(qp);
        qp.addChild(new Command(cmd));
        return r;
    }

    /**
     * 
     * @param {function} callback
     * @returns {TreeNode}
     */
    getDirectory(callback) {
        if (callback != null && !this.isStream()) {
            this.contents._subscribers.add(callback);
        }
        return this.getCommand(COMMAND_GETDIRECTORY);
    }

    /**
     * 
     * @param {boolean} complete
     * @returns {Parameter}
     */
    getMinimal(complete = false) {
        const number = this.getNumber();
        const p = new Parameter(number);
        if (complete) {
            if (this.contents != null) {
                p = this.contents;
            }
        }
        return p;
    }

    /**
     * 
     * @param {number|string} value
     * @returns {TreeNode}
     */
    setValue(value) {
        let r = new TreeNode();
        let qp = new QualifiedParameter(this.path);
        r.addElement(qp);
        qp.contents = (value instanceof ParameterContents) ? value : new ParameterContents(value);
        return r;
    }

    /**
     * 
     * @param {function} callback
     * @returns {TreeNode}
     */
    subscribe(callback) {
        if (this.path === undefined) {
            throw new Error("Invalid path");
        }
        if (callback != null && this.isStream()) {
            this.contents._subscribers.add(callback);
        }
        return this.getCommand(COMMAND_SUBSCRIBE);
    }
    
    /**
     * 
     * @param {function} callback
     * @returns {TreeNode}
     */
    unsubscribe(callback) {
        if (this.path === undefined) {
            throw new Error("Invalid path");
        }
        if (callback != null && this.isStream()) {
            this.contents._subscribers.delete(callback);
        }
        return this.getCommand(COMMAND_UNSUBSCRIBE);
    }

    /**
     * 
     * @param {QualifiedParameter} other 
     */
    update(other) {
        if ((other !== undefined) && (other.contents !== undefined)) {
            if (this.contents == null) {
                this.contents = other.contents;
            }
            else {
                for (var key in other.contents) {
                    if (key[0] === "_") {
                        continue;
                    }
                    if (other.contents.hasOwnProperty(key)) {
                        this.contents[key] = other.contents[key];
                    }
                }
                for(let cb of this.contents._subscribers) {
                    cb(this);
                } 
            }
        }
        return;
    }

    /**
     * 
     * @param {BER} ber 
     * @returns {QualifiedParameter}
     */
    static decode(ber) {
        var qp = new QualifiedParameter();
        ber = ber.getSequence(BER.APPLICATION(9));
        while(ber.remain > 0) {
            var tag = ber.peek();
            var seq = ber.getSequence(tag);
            if(tag == BER.CONTEXT(0)) {
                qp.path = seq.readRelativeOID(BER.EMBER_RELATIVE_OID); // 13 => relative OID
            }
            else if(tag == BER.CONTEXT(1)) {
                qp.contents = ParameterContents.decode(seq);
            } else if(tag == BER.CONTEXT(2)) {
                qp.decodeChildren(seq);
            } else {
                return qp;
            }
        }
        if (DEBUG) { console.log("QualifiedParameter", qp); }
        return qp;
    }
}

module.exports = QualifiedParameter;