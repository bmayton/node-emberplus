"use strict";
const BER = require('../ber.js');
const FunctionArgument = require("./FunctionArgument");
const errors = require("../Errors");

class FunctionContent {
    constructor(identifier=null, description=null) {
        this.arguments = [];
        this.result = [];
        this.identifier = identifier;
        this.description = description;
    }

    /**
     * 
     * @param {BER} ber 
     */
    encode(ber) {
        ber.startSequence(BER.EMBER_SET);
    
        if(this.identifier != null) {
            ber.startSequence(BER.CONTEXT(0));
            ber.writeString(this.identifier, BER.EMBER_STRING);
            ber.endSequence(); // BER.CONTEXT(0)
        }
    
        if(this.description != null) {
            ber.startSequence(BER.CONTEXT(1));
            ber.writeString(this.description, BER.EMBER_STRING);
            ber.endSequence(); // BER.CONTEXT(1)
        }
    
        if(this.arguments != null) {
            ber.startSequence(BER.CONTEXT(2));
            ber.startSequence(BER.EMBER_SEQUENCE);
            for(var i = 0; i < this.arguments.length; i++) {
                ber.startSequence(BER.CONTEXT(0));
                this.arguments[i].encode(ber);
                ber.endSequence();
            }
            ber.endSequence();
            ber.endSequence(); // BER.CONTEXT(2)
        }
    
        if(this.result != null && this.result.length > 0) {
            ber.startSequence(BER.CONTEXT(3));
            ber.startSequence(BER.EMBER_SEQUENCE);
            for(let i = 0; i < this.result.length; i++) {                                
                ber.startSequence(BER.CONTEXT(0));
                /** @type {FunctionArgument} */
                this.result[i].encode(ber);
                ber.endSequence();
            }
            ber.endSequence();
            ber.endSequence(); // BER.CONTEXT(3)
        }

        if(this.templateReference != null) {
            ber.startSequence(BER.CONTEXT(4));
            ber.writeRelativeOID(this.templateReference, BER.EMBER_RELATIVE_OID);
            ber.endSequence(); // BER.CONTEXT(3)
        }
    
        ber.endSequence(); // BER.EMBER_SET
    }

    /**
     * 
     * @param {BER} ber 
     * @returns {FunctionContent}
     */
    static decode(ber) {
        const fc = new FunctionContent();
        ber = ber.getSequence(BER.EMBER_SET);
        while(ber.remain > 0) {
            let tag = ber.peek();
            let seq = ber.getSequence(tag);
            if(tag == BER.CONTEXT(0)) {
                fc.identifier = seq.readString(BER.EMBER_STRING);
            } else if(tag == BER.CONTEXT(1)) {
                fc.description = seq.readString(BER.EMBER_STRING);
            } else if(tag == BER.CONTEXT(2)) {
                fc.arguments = [];
                let dataSeq = seq.getSequence(BER.EMBER_SEQUENCE);
                while(dataSeq.remain > 0) {
                    seq = dataSeq.getSequence(BER.CONTEXT(0));
                    fc.arguments.push(FunctionArgument.decode(seq));
                }
            } else if(tag == BER.CONTEXT(3)) {
                fc.result = [];
                let dataSeq = seq.getSequence(BER.EMBER_SEQUENCE);
                while(dataSeq.remain > 0) {
                    tag = dataSeq.peek();                    
                    if (tag === BER.CONTEXT(0)) {
                        const fcSeq = dataSeq.getSequence(tag);
                        fc.result.push(FunctionArgument.decode(fcSeq));
                    }
                    else {
                        throw new errors.UnimplementedEmberTypeError(tag);
                    }
                }
            } else if(tag == BER.CONTEXT(4)) {
                fc.templateReference = seq.readRelativeOID(BER.EMBER_RELATIVE_OID);
            } else {
                throw new errors.UnimplementedEmberTypeError(tag);
            }
        }
    
        return fc;
    }
}

module.exports = FunctionContent;