"use strict";

const BER = require('../ber.js');


class InvocationResult {
    /**
     * 
     * @param {number|null} invocationId=null
     */
    constructor(invocationId = null) {
        this.invocationId = invocationId;
    }

    /**
     * 
     * @param {BER} ber 
     */
    encode(ber) {
        ber.startSequence(BER.APPLICATION(23));
        if (this.invocationId != null) {
            ber.startSequence(BER.CONTEXT(0));
            ber.writeInt(this.invocationId);
            ber.endSequence();
        }
        if (this.success != null) {
            ber.startSequence(BER.CONTEXT(1));
            ber.writeBoolean(this.success);
            ber.endSequence();
        }
        if (this.result != null && this.result.length) {
            ber.startSequence(BER.CONTEXT(2));
            ber.startSequence(BER.EMBER_SEQUENCE);
            for (let i = 0; i < this.result.length; i++) {
                ber.startSequence(BER.CONTEXT(0));
                ber.writeValue(this.result[i].value, ParameterTypetoBERTAG(this.result[i].type));
                ber.endSequence();
            }
            ber.endSequence();
            ber.endSequence();
        }
        ber.endSequence(); // BER.APPLICATION(23)}
    }

    /**
     * 
     */
    setFailure() {
        this.success = false;
    }

    /**
     * 
     */
    setSuccess() {
        this.success = true;
    }

    /**
     * 
     * @param {} result 
     */
    setResult(result) {
        if (!Array.isArray(result)) {
            throw new Error("Invalid inovation result. Should be array");
        }
        this.result = result;
    }

    toQualified() {
        return this;
    }

    /**
     * 
     * @param {BER} ber 
     * @returns {InvocationResult}
     */
    static decode(ber) {
        const invocationResult = new InvocationResult();
        ber = ber.getSequence(BER.APPLICATION(23));
        while(ber.remain > 0) {
            tag = ber.peek();
            var seq = ber.getSequence(tag);
            if(tag == BER.CONTEXT(0)) { // invocationId
                invocationResult.invocationId = seq.readInt();
            } else if(tag == BER.CONTEXT(1)) {  // success
                invocationResult.success = seq.readBoolean()
            }else if(tag == BER.CONTEXT(2)) {
                invocationResult.result = [];
                let res = seq.getSequence(BER.EMBER_SEQUENCE);
                while(res.remain > 0) {
                    tag = res.peek();
                    if (tag === BER.CONTEXT(0)) {
                        let resTag = res.getSequence(BER.CONTEXT(0));                
                        tag = resTag.peek();
                        invocationResult.result.push(
                            new FunctionArgument(
                                ParameterTypefromBERTAG(tag),
                                resTag.readValue()
                        ));
                    }
                }
                continue
            } else {
                // TODO: options
                throw new errors.UnimplementedEmberTypeError(tag);
            }
        }
    
        return invocationResult;
    }
}

module.exports = InvocationResult;