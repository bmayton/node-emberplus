"use strict";
const {ParameterTypefromBERTAG, ParameterTypetoBERTAG} = require("./ParameterType");
const BER = require('../ber.js');

let _id = 1;
class Invocation {
    constructor(id = null) {
        this.id = id == null ? _id++ : id;
        this.arguments = [];
    }

    /**
     * 
     * @param {BER} ber 
     */
    encode(ber) {
        ber.startSequence(BER.APPLICATION(22));
        // ber.startSequence(BER.EMBER_SEQUENCE);
    
        ber.startSequence(BER.CONTEXT(0));
        ber.writeInt(this.id)
        ber.endSequence();
    
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
     * @param {BER} ber 
     * @returns {Invocation}
     */
    static decode(ber) {
        const invocation = null;
        ber = ber.getSequence(BER.APPLICATION(22));
        while(ber.remain > 0) {
            var tag = ber.peek();
            var seq = ber.getSequence(tag);
            if(tag == BER.CONTEXT(0)) {
                const invocationId = seq.readInt();
                invocation = new Invocation(invocationId);
            }
            else if(tag == BER.CONTEXT(1)) {
                if (invocation == null) {
                    throw new Error("Missing invocationID");
                }
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
}

module.exports = Invocation;