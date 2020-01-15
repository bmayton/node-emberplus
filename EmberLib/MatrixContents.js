"use strict";

const MatrixType = require("./MatrixType");
const MatrixMode = require("./MatrixMode");
const BER = require('../ber.js');
const Label = require("./Label");
const errors = require("../Errors");

class MatrixContents {
    constructor(type = MatrixType.oneToN, mode = MatrixMode.linear) {
        this.type = type;
        this.mode = mode;
    }

    /**
     * 
     * @param {BER} ber 
     */
    encode(ber) {
        ber.startSequence(BER.EMBER_SET);
        if (this.identifier != null) {
            ber.startSequence(BER.CONTEXT(0));
            ber.writeString(this.identifier, BER.EMBER_STRING);
            ber.endSequence();
        }
        if (this.description != null) {
            ber.startSequence(BER.CONTEXT(1));
            ber.writeString(this.description, BER.EMBER_STRING);
            ber.endSequence();
        }
        if (this.type != null) {
            ber.startSequence(BER.CONTEXT(2));
            ber.writeInt(this.type.value);
            ber.endSequence();
        }
        if (this.mode != null) {
            ber.startSequence(BER.CONTEXT(3));
            ber.writeInt(this.mode.value);
            ber.endSequence();
        }
        if (this.targetCount != null) {
            ber.startSequence(BER.CONTEXT(4));
            ber.writeInt(this.targetCount);
            ber.endSequence();
        }
        if (this.sourceCount != null) {
            ber.startSequence(BER.CONTEXT(5));
            ber.writeInt(this.sourceCount);
            ber.endSequence();
        }
        if (this.maximumTotalConnects != null) {
            ber.startSequence(BER.CONTEXT(6));
            ber.writeInt(this.maximumTotalConnects);
            ber.endSequence();
        }
        if (this.maximumConnectsPerTarget != null) {
            ber.startSequence(BER.CONTEXT(7));
            ber.writeInt(this.maximumConnectsPerTarget);
            ber.endSequence();
        }
        if (this.parametersLocation != null) {
            ber.startSequence(BER.CONTEXT(8));
            let param = Number(this.parametersLocation)
            if (isNaN(param)) {
                ber.writeRelativeOID(this.parametersLocation, BER.EMBER_RELATIVE_OID);
            }
            else {
                ber.writeInt(param);
            }
            ber.endSequence();
        }
        if (this.gainParameterNumber != null) {
            ber.startSequence(BER.CONTEXT(9));
            ber.writeInt(this.gainParameterNumber);
            ber.endSequence();
        }
        if (this.labels != null) {
            ber.startSequence(BER.CONTEXT(10));
            ber.startSequence(BER.EMBER_SEQUENCE);
            for(var i =0; i < this.labels.length; i++) {
                ber.startSequence(BER.CONTEXT(0));
                this.labels[i].encode(ber);
                ber.endSequence();
            }
            ber.endSequence();
            ber.endSequence();
        }
        if (this.schemaIdentifiers != null) {
            ber.startSequence(BER.CONTEXT(11));
            ber.writeString(this.schemaIdentifiers, BER.EMBER_STRING);
            ber.endSequence();
        }
        if (this.templateReference != null) {
            ber.startSequence(BER.CONTEXT(12));
            ber.writeRelativeOID(this.templateReference, BER.EMBER_RELATIVE_OID);
            ber.endSequence();
        }
        ber.endSequence();
    }

    static decode(ber) {
        const mc = new MatrixContents();
        ber = ber.getSequence(BER.EMBER_SET);
        while(ber.remain > 0) {
            let tag = ber.peek();
            let seq = ber.getSequence(tag);
    
            if(tag == BER.CONTEXT(0)) {
                mc.identifier = seq.readString(BER.EMBER_STRING);
            } else if(tag == BER.CONTEXT(1)) {
                mc.description = seq.readString(BER.EMBER_STRING);
            } else if(tag == BER.CONTEXT(2)) {
                mc.type = MatrixType.get(seq.readInt());
            } else if(tag == BER.CONTEXT(3)) {
                mc.mode = MatrixMode.get(seq.readInt());
            } else if(tag == BER.CONTEXT(4)) {
                mc.targetCount = seq.readInt();
            } else if(tag == BER.CONTEXT(5)) {
                mc.sourceCount = seq.readInt();
            } else if(tag == BER.CONTEXT(6)) {
                mc.maximumTotalConnects = seq.readInt();
            } else if(tag == BER.CONTEXT(7)) {
                mc.maximumConnectsPerTarget = seq.readInt();
            } else if(tag == BER.CONTEXT(8)) {
                tag = seq.peek();
                if (tag === BER.EMBER_RELATIVE_OID) {
                    mc.parametersLocation = seq.readRelativeOID(BER.EMBER_RELATIVE_OID); // 13 => relative OID
                }
                else {
                    mc.parametersLocation = seq.readInt();
                }
            } else if(tag == BER.CONTEXT(9)) {
                mc.gainParameterNumber = seq.readInt();
            } else if(tag == BER.CONTEXT(10)) {
                mc.labels = [];
                seq = seq.getSequence(BER.EMBER_SEQUENCE);
                while(seq.remain > 0) {
                    let lSeq = seq.getSequence(BER.CONTEXT(0));
                    mc.labels.push(Label.decode(lSeq));
                }
            } else if(tag == BER.CONTEXT(11)) {
                mc.schemaIdentifiers = seq.readString(BER.EMBER_STRING);
            } else if(tag == BER.CONTEXT(12)) {
                mc.templateReference = seq.readRelativeOID(BER.EMBER_RELATIVE_OID);
            }
            else {
                throw new errors.UnimplementedEmberTypeError(tag);
            }
        }
        return mc;
    }
}

module.exports = MatrixContents;