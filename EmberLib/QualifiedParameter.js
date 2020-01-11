"use strict";

const QualifiedElement = require("./QualifiedElement");
const ParameterContents = require("./ParameterContents");
const BER = require('../ber.js');
const Parameter = require("./Parameter");

class QualifiedParameter extends QualifiedElement {
    /**
     * 
     * @param {string} path 
     */
    constructor(path) {
        super(path);
        this._seqID = BER.APPLICATION(9);
    }

    /**
     * @returns {boolean}
     */
    isParameter() {
        return true;
    }

    /**
     * 
     * @param {boolean} complete
     * @returns {Parameter}
     */
    getMinimal(complete = false) {
        const number = this.getNumber();
        const p = new Parameter(number);
        if (complete) {
            if (this.contents != null) {
                p.contents = this.contents;
            }
        }
        return p;
    }

    /**
     * 
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
     * @param {QualifiedParameter} other 
     */
    update(other) {
        if ((other != null) && (other.contents != null)) {
            if (this.contents == null) {
                this.contents = other.contents;
            }
            else {
                for (var key in other.contents) {
                    if (key[0] === "_") {
                        continue;
                    }
                    if (other.contents.hasOwnProperty(key)) {
                        this.contents[key] = other.contents[key];
                    }
                }
                for(let cb of this.contents._subscribers) {
                    cb(this);
                } 
            }
        }
        return;
    }

    /**
     * 
     * @param {BER} ber 
     * @returns {QualifiedParameter}
     */
    static decode(ber) {
        var qp = new QualifiedParameter();
        ber = ber.getSequence(BER.APPLICATION(9));
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
                return qp;
            }
        }
        return qp;
    }
}

module.exports = QualifiedParameter;