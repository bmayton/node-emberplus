"use strict";

const BER = require('../ber.js');
const {ParameterTypefromBERTAG, ParameterTypetoBERTAG} = require("./ParameterType");
const FunctionArgument = require("./FunctionArgument");
const Errors = require("../Errors");


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
        ber.startSequence(InvocationResult.BERID);
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
            throw new Errors.InvalidResultFormat();
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
        ber = ber.getSequence(InvocationResult.BERID);
        while(ber.remain > 0) {
            let tag = ber.peek();
            let seq = ber.getSequence(tag);
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
                    else {
                        throw new Errors.UnimplementedEmberTypeError(tag);
                    }
                }
                continue
            } else {
                throw new Errors.UnimplementedEmberTypeError(tag);
            }
        }
    
        return invocationResult;
    }


    /**
     * @returns {number}
     */
    static get BERID() {
        return BER.APPLICATION(23);
    }
}

module.exports = InvocationResult;