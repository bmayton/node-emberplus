"use strict";
const BER = require('../ber.js');
const errors = require("../errors");

class NodeContents{
    constructor() {
        this.isOnline = true;
        this._subscribers = new Set();
    }

    /**
     * 
     * @param {BER} ber 
     */
    encode(ber) {
        ber.startSequence(BER.EMBER_SET);
    
        if(this.identifier !== undefined) {
            ber.startSequence(BER.CONTEXT(0));
            ber.writeString(this.identifier, BER.EMBER_STRING);
            ber.endSequence(); // BER.CONTEXT(0)
        }
    
        if(this.description !== undefined) {
            ber.startSequence(BER.CONTEXT(1));
            ber.writeString(this.description, BER.EMBER_STRING);
            ber.endSequence(); // BER.CONTEXT(1)
        }
    
        if(this.isRoot !== undefined) {
            ber.startSequence(BER.CONTEXT(2));
            ber.writeBoolean(this.isRoot);
            ber.endSequence(); // BER.CONTEXT(2)
        }
    
        if(this.isOnline !== undefined) {
            ber.startSequence(BER.CONTEXT(3));
            ber.writeBoolean(this.isOnline);
            ber.endSequence(); // BER.CONTEXT(3)
        }
    
        if(this.schemaIdentifiers !== undefined) {
            ber.startSequence(BER.CONTEXT(4));
            ber.writeString(this.schemaIdentifiers, BER.EMBER_STRING);
            ber.endSequence(); // BER.CONTEXT(4)
        }
    
        ber.endSequence(); // BER.EMBER_SET
    }
    
    /**
     * 
     * @param {BER} ber 
     * @returns {NodeContents}
     */
    static decode(ber) {
        var nc = new NodeContents();
        ber = ber.getSequence(BER.EMBER_SET);
        while(ber.remain > 0) {
            var tag = ber.peek();
            var seq = ber.getSequence(tag);
            if(tag == BER.CONTEXT(0)) {
                nc.identifier = seq.readString(BER.EMBER_STRING);
            } else if(tag == BER.CONTEXT(1)) {
                nc.description = seq.readString(BER.EMBER_STRING);
            } else if(tag == BER.CONTEXT(2)) {
                nc.isRoot = seq.readBoolean();
            } else if(tag == BER.CONTEXT(3)) {
                nc.isOnline = seq.readBoolean();
            } else if(tag == BER.CONTEXT(4)) {
                nc.schemaIdentifiers = seq.readString(BER.EMBER_STRING);
            } else {
                throw new errors.UnimplementedEmberTypeError(tag);
            }
        }
    
        return nc;
    }    
}

module.exports = NodeContents;