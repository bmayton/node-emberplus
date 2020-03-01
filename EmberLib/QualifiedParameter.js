"use strict";

const QualifiedElement = require("./QualifiedElement");
const ParameterContents = require("./ParameterContents");
const BER = require('../ber.js');
const Errors = require("../Errors");

class QualifiedParameter extends QualifiedElement {
    /**
     * 
     * @param {string} path 
     */
    constructor(path) {
        super(path);
        this._seqID = QualifiedParameter.BERID;
    }

    /**
     * @returns {boolean}
     */
    isParameter() {
        return true;
    }

    /**
     * Generate a Root containing a minimal  QualifiedParameter and its new value.
     * Should be sent to the Provider to update the value.
     * @param {number|string} value
     * @returns {TreeNode}
     */ 
    setValue(value) {
        let r = this.getNewTree();
        let qp = new QualifiedParameter(this.path);
        r.addElement(qp);
        qp.contents = (value instanceof ParameterContents) ? value : new ParameterContents(value);
        return r;
    }


    /**
     * 
     * @param {BER} ber 
     * @returns {QualifiedParameter}
     */
    static decode(ber) {
        var qp = new QualifiedParameter();
        ber = ber.getSequence(QualifiedParameter.BERID);
        while(ber.remain > 0) {
            var tag = ber.peek();
            var seq = ber.getSequence(tag);
            if(tag == BER.CONTEXT(0)) {
                qp.path = seq.readRelativeOID(BER.EMBER_RELATIVE_OID); // 13 => relative OID
            }
            else if(tag == BER.CONTEXT(1)) {
                qp.contents = ParameterContents.decode(seq);
            } else if(tag == BER.CONTEXT(2)) {
                qp.decodeChildren(seq);
            } else {
                throw new Errors.UnimplementedEmberTypeError(tag);
            }
        }
        return qp;
    }

    /**
     * @returns {number}
     */
    static get BERID() {
        return BER.APPLICATION(9);
    }
}

module.exports = QualifiedParameter;