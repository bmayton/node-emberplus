"use strict";
const TreeNode = require("./TreeNode");
const BER = require('../ber.js');
const Command = require("./Command");
const {COMMAND_GETDIRECTORY} = require("./constants");

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
    
        this.encodePath(ber);
    
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
     * @param {Command} cmd
     * @returns {TreeNode}
     */
    getCommand(cmd) {
        const r = this.getNewTree();
        const qn = new this.constructor();
        qn.path = this.getPath();        
        r.addElement(qn);
        qn.addChild(cmd);
        return r;
    }
}

module.exports = QualifiedElement;