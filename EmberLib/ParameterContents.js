"use strict";

const {ParameterType} = require("./ParameterType");
const ParameterAccess = require("./ParameterAccess");
const StringIntegerCollection = require("./StringIntegerCollection");
const StreamDescription = require("./StreamDescription");
const BER = require('../ber.js');
const errors = require("../errors");

class ParameterContents {
    /**
     * 
     * @param {string|number} value 
     * @param {string} type 
     */
    constructor(value, type) {
        this._subscribers = new Set();
        if(value != null) {
            this.value = value;
        }
        if(type != null) {
            if((type = ParameterType.get(type)) != null){
                this.type = type
            }
        }
    }

    /**
     * 
     * @param {BER} ber 
     */
    encode(ber) {
        ber.startSequence(BER.EMBER_SET);
    
        ber.writeIfDefined(this.identifier, ber.writeString, 0, BER.EMBER_STRING);
        ber.writeIfDefined(this.description, ber.writeString, 1, BER.EMBER_STRING);
        ber.writeIfDefined(this.value, ber.writeValue, 2);
        ber.writeIfDefined(this.minimum, ber.writeValue, 3);
        ber.writeIfDefined(this.maximum, ber.writeValue, 4);
        ber.writeIfDefinedEnum(this.access, ParameterAccess, ber.writeInt, 5);
        ber.writeIfDefined(this.format, ber.writeString, 6, BER.EMBER_STRING);
        ber.writeIfDefined(this.enumeration, ber.writeString, 7, BER.EMBER_STRING);
        ber.writeIfDefined(this.factor, ber.writeInt, 8);
        ber.writeIfDefined(this.isOnline, ber.writeBoolean, 9);
        ber.writeIfDefined(this.formula, ber.writeString, 10, BER.EMBER_STRING);
        ber.writeIfDefined(this.step, ber.writeInt, 11);
        ber.writeIfDefined(this.default, ber.writeValue, 12);
        ber.writeIfDefinedEnum(this.type, ParameterType, ber.writeInt, 13);
        ber.writeIfDefined(this.streamIdentifier, ber.writeInt, 14);
    
        if(this.stringIntegerCollection != null) {            
            this.stringIntegerCollection.encode(ber);
        }
    
        if(this.streamDescriptor != null) {
            ber.startSequence(BER.CONTEXT(16));
            this.streamDescriptor.encode(ber);
            ber.endSequence();
        }
    
        ber.writeIfDefined(this.schemaIdentifiers, ber.writeString, 17, BER.EMBER_STRING);
    
        ber.endSequence();
    }

    /**
     * 
     * @param {BER} ber 
     * @returns {ParameterContents}
     */
    static decode(ber) {
        const pc = new ParameterContents();
        ber = ber.getSequence(BER.EMBER_SET);
    
        while(ber.remain > 0) {
            let tag = ber.peek();
            let seq = ber.getSequence(tag);
            if(tag == BER.CONTEXT(0)) {
                pc.identifier = seq.readString(BER.EMBER_STRING);
            } else if(tag == BER.CONTEXT(1)) {
                pc.description = seq.readString(BER.EMBER_STRING);
            } else if(tag == BER.CONTEXT(2)) {
                pc.value = seq.readValue();
            } else if(tag == BER.CONTEXT(3)) {
                pc.minimum = seq.readValue();
            } else if(tag == BER.CONTEXT(4)) {
                pc.maximum = seq.readValue();
            } else if(tag == BER.CONTEXT(5)) {
                pc.access = ParameterAccess.get(seq.readInt());
            } else if(tag == BER.CONTEXT(6)) {
                pc.format = seq.readString(BER.EMBER_STRING);
            } else if(tag == BER.CONTEXT(7)) {
                pc.enumeration = seq.readString(BER.EMBER_STRING);
            } else if(tag == BER.CONTEXT(8)) {
                pc.factor = seq.readInt();
            } else if(tag == BER.CONTEXT(9)) {
                pc.isOnline = seq.readBoolean();
            } else if(tag == BER.CONTEXT(10)) {
                pc.formula = seq.readString(BER.EMBER_STRING);
            } else if(tag == BER.CONTEXT(11)) {
                pc.step = seq.readInt();
            } else if(tag == BER.CONTEXT(12)) {
                pc.default = seq.readValue();
            } else if(tag == BER.CONTEXT(13)) {
                pc.type = ParameterType.get(seq.readInt());
            } else if(tag == BER.CONTEXT(14)) {
                pc.streamIdentifier = seq.readInt();
            } else if(tag == BER.CONTEXT(15)) {
                pc.stringIntegerCollection = StringIntegerCollection.decode(seq);
            } else if(tag == BER.CONTEXT(16)) {
                pc.streamDescriptor = StreamDescription.decode(seq);
            } else if(tag == BER.CONTEXT(17)) {
                pc.schemaIdentifiers = seq.readString(BER.EMBER_STRING);
            } else if (tag == null) {
                break;
            }
            else {
                throw new errors.UnimplementedEmberTypeError(tag);
            }
        }
        return pc;
    }    
}

module.exports = ParameterContents;
