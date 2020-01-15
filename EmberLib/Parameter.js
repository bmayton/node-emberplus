"use strict";

const Element = require("./Element");
const QualifiedParameter = require("./QualifiedParameter");
const BER = require('../ber.js');
const ParameterContents = require("./ParameterContents");
const Errors = require("../Errors");

class Parameter extends Element {
    /**
     * 
     * @param {number} number 
     */
    constructor(number) {
        super();
        this.number = number;
        this._seqID = Parameter.BERID;
    }

    /**
     * @returns {boolean}
     */
    isParameter() {
        return true;
    }

    /**
     * 
     * @param {string|number} value
     * @returns {Root}
     */
    setValue(value) {
        return this.getTreeBranch(undefined, (m) => {
            m.contents = (value instanceof ParameterContents) ? value : new ParameterContents(value);
        });
    }

    /**
     * @returns {QualifiedParameter}
     */
    toQualified() {
        const qp = new QualifiedParameter(this.getPath());
        qp.update(this);
        return qp;
    }
    
    /**
     * 
     * @param {BER} ber
     * @returns {Parameter}
     */
    static decode(ber) {
        const p = new Parameter();
        ber = ber.getSequence(Parameter.BERID);
    
        while(ber.remain > 0) {
            let tag = ber.peek();
            let seq = ber.getSequence(tag);
            if(tag == BER.CONTEXT(0)) {
                p.number = seq.readInt();
    
            } else if(tag == BER.CONTEXT(1)) {
                p.contents = ParameterContents.decode(seq);
            } else if(tag == BER.CONTEXT(2)) {
                p.decodeChildren(seq);
            } else {
                throw new Errors.UnimplementedEmberTypeError(tag);
            }
        }
        return p;
    }
    
    /**
     * @returns {number}
     */
    static get BERID() {
        return BER.APPLICATION(1);
    }
}

module.exports = Parameter;