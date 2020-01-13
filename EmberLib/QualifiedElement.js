"use strict";
const TreeNode = require("./TreeNode");
const BER = require('../ber.js');
const Command = require("./Command");
const {COMMAND_GETDIRECTORY, COMMAND_SUBSCRIBE, COMMAND_UNSUBSCRIBE} = require("./constants");

class QualifiedElement extends TreeNode {
    /**
     * 
     * @param {string} path 
     */
    constructor(path) {
        super();
        this.path = path;
    }

    /**
     * @returns {boolean}
     */
    isQualified() {
        return true;
    }

    /**
     * 
     * @param {BER} ber 
     */
    encode(ber) {
        ber.startSequence(this._seqID);
    
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
     * @param {string} key
     * @param {string} value
     * @returns {TreeNode}
     */
    getCommand(cmd, key, value) {
        const r = this.getNewTree();
        const qn = new this.constructor();
        qn.path = this.getPath();        
        r.addElement(qn);
        const command = new Command(cmd);
        if (key != null) {
            command[key] = value;
        }
        qn.addChild(command);
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
}

module.exports = QualifiedElement;