"use strict";
const BER = require('../ber.js');
const {ParameterType} = require("./ParameterType");
const Errors = require("../Errors");

/*
TupleDescription ::=
 SEQUENCE OF [0] TupleItemDescription
TupleItemDescription ::=
 [APPLICATION 21] IMPLICIT
 SEQUENCE {
 type [0] ParameterType,
 name [1] EmberString OPTIONAL
 }
Invocation ::=
 [APPLICATION 22] IMPLICIT
 SEQUENCE {
 invocationId [0] Integer32 OPTIONAL,
 arguments [1] Tuple OPTIONAL
 }
Tuple ::=
 SEQUENCE OF [0] Value
*/

class FunctionArgument {
    /**
     * 
     * @param {ParameterType} type 
     * @param {number|string|null} value 
     * @param {string|null} name 
     */
    constructor (type = null, value = null, name = null) {
        /** @type {ParameterType} */
        this.type = type;
        this.value = value;
        this.name = name;
    }

    /**
     * 
     * @param {BER} ber 
     */
    encode(ber) {
        ber.startSequence(FunctionArgument.BERID);
        if (this.type == null) {
            throw new Errors.InvalidEmberNode("", "FunctionArgument requires a type")
        }
        ber.startSequence(BER.CONTEXT(0));
        ber.writeInt(this.type.value);
        ber.endSequence();        
        if (this.name != null) {
            ber.startSequence(BER.CONTEXT(1));
            ber.writeString(this.name, BER.EMBER_STRING);
            ber.endSequence();
        }
        ber.endSequence();
    }

    /**
     * 
     */
    toJSON() {
        return {
            type: this.type,
            name: this.name,
            value: this.value
        };
    }

    /**
     * 
     * @param {BER} ber 
     * @returns {FunctionArgument}
     */
    static decode(ber) {
        const tuple = new FunctionArgument();
        ber = ber.getSequence(FunctionArgument.BERID);
        while(ber.remain > 0) {
            let tag = ber.peek();
            let seq = ber.getSequence(tag);
            if (tag === BER.CONTEXT(0)) {
                tuple.type = ParameterType.get(seq.readInt());
            }
            else if (tag === BER.CONTEXT(1)) {
                tuple.name = seq.readString(BER.EMBER_STRING);
            }
            else {
                throw new Errors.UnimplementedEmberTypeError(tag);
            }
        }
        return tuple;
    }

    /**
     * 
     */
    static get BERID() {
        return BER.APPLICATION(21);
    }
}

module.exports = FunctionArgument;