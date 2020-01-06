"use strict";
const TreeNode = require("./TreeNode");
const BER = require('../ber.js');

class Element extends TreeNode {
    /**
     * 
     * @param {number} number 
     */
    constructor(number) {
        super();
        this.number = number;
    }

    /**
     * 
     * @param {BER} ber 
     */
    encode(ber) {
        ber.startSequence(this._seqID);
    
        ber.startSequence(BER.CONTEXT(0));
        ber.writeInt(this.number);
        ber.endSequence(); // BER.CONTEXT(0)
    
        if(this.contents != null) {
            ber.startSequence(BER.CONTEXT(1));
            this.contents.encode(ber);
            ber.endSequence(); // BER.CONTEXT(1)
        }
    
        this.encodeChildren(ber);
    
        ber.endSequence(); // BER.APPLICATION(3)
    }
}

module.exports = Element;