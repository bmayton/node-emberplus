"use strict";
const Element = require("./Element");
const QualifiedFunction = require("./QualifiedFunction");
const BER = require('../ber.js');
const Command = require("./Command");
const {COMMAND_INVOKE} = require("./constants");
const FunctionContent = require("./FunctionContent");
const Errors = require("../Errors");

class Function extends Element {
    constructor(number, func) {
        super();
        this.number = number;
        this.func = func;
        this._seqID = Function.BERID;
    }

    /**
     * @returns {boolean}
     */
    isFunction() {
        return true;
    }

    /**
     * @returns {QualifiedFunction}
     */
    toQualified() {
        const qf = new QualifiedFunction(this.getPath());
        qf.update(this);
        return qf;
    }


    /**
     * 
     * @param {BER} ber 
     * @returns {Function}
     */
    static decode(ber) {
        const f = new Function();
        ber = ber.getSequence(Function.BERID);
    
        while(ber.remain > 0) {
            let tag = ber.peek();
            let seq = ber.getSequence(tag);
            if(tag == BER.CONTEXT(0)) {
                f.number = seq.readInt();
            } else if(tag == BER.CONTEXT(1)) {
                f.contents = FunctionContent.decode(seq);
            } else if(tag == BER.CONTEXT(2)) {
                f.decodeChildren(seq);
            } else {
                throw new Errors.UnimplementedEmberTypeError(tag);
            }
        }
        return f;
    }

    /**
     * 
     */
    static get BERID() {
        return BER.APPLICATION(19);
    }
}

module.exports = Function;