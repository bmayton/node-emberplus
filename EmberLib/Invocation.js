"use strict";
const {ParameterTypefromBERTAG, ParameterTypetoBERTAG} = require("./ParameterType");
const BER = require('../ber.js');
const FunctionArgument = require("./FunctionArgument");
const errors = require("../Errors");

let _id = 1;
class Invocation {
    /**
     * 
     * @param {number} id 
     * @param {FunctionArgument[]} args 
     */
    constructor(id = null, args = []) {
        this.id = id;
        this.arguments = args;
    }

    /**
     * 
     * @param {BER} ber 
     */
    encode(ber) {
        ber.startSequence(Invocation.BERID);            
        if (this.id != null) {
            ber.startSequence(BER.CONTEXT(0));
            ber.writeInt(this.id)
            ber.endSequence();
        }
        ber.startSequence(BER.CONTEXT(1));
        ber.startSequence(BER.EMBER_SEQUENCE);
        for(var i = 0; i < this.arguments.length; i++) {
            ber.startSequence(BER.CONTEXT(0));
            ber.writeValue(
                this.arguments[i].value, 
                ParameterTypetoBERTAG(this.arguments[i].type
            ));
            ber.endSequence();
        }
        ber.endSequence();
        ber.endSequence();
    
        ber.endSequence(); // BER.APPLICATION(22)
    }

    /**
     * 
     */
    toJSON() {
        return {
            id: this.id,
            arguments: this.arguments == null ? null : this.arguments.map(a => a.toJSON()),
        }
    }
    
    /**
     * 
     * @param {BER} ber 
     * @returns {Invocation}
     */
    static decode(ber) {
        const invocation = new Invocation();
        ber = ber.getSequence(Invocation.BERID);
        while(ber.remain > 0) {
            let tag = ber.peek();
            let seq = ber.getSequence(tag);
            if(tag == BER.CONTEXT(0)) {
                invocation.id = seq.readInt();
            }
            else if(tag == BER.CONTEXT(1)) {
                invocation.arguments = [];
                seq = seq.getSequence(BER.EMBER_SEQUENCE);
                while(seq.remain > 0) {
                    const dataSeq = seq.getSequence(BER.CONTEXT(0));
                    tag = dataSeq.peek();                
                    const val = dataSeq.readValue();
                    invocation.arguments.push(
                        new FunctionArgument(ParameterTypefromBERTAG(tag), val)
                    );
                }
            }
            else {
                // TODO: options
                throw new errors.UnimplementedEmberTypeError(tag);
            }
        }
        return invocation;
    }

    /**
     * @returns {number}
     */
    static get BERID() {
        return BER.APPLICATION(22);
    }

    /**
     * @returns {number}
     */
    static newInvocationID() {
        return _id++;
    }
}

module.exports = Invocation;