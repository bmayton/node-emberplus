"use strict";

const Element = require("./Element");
const QualifiedParameter = require("./QualifiedParameter");
const BER = require('../ber.js');
const ParameterContents = require("./ParameterContents");
const errors = require("../errors");

class Parameter extends Element {
    /**
     * 
     * @param {number} number 
     */
    constructor(number) {
        super();
        this.number = number;
        this._seqID = BER.APPLICATION(1);
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
        let qp = new QualifiedParameter(this.getPath());
        qp.update(this);
        return qp;
    }

    /**
     * 
     * @param {Parameter} other 
     */
    update(other) {
        if ((other != null) && (other.contents != null)) {
            if (this.contents == null) {
                this.contents = other.contents;
            }
            else {
                for (var key in other.contents) {
                    if (key[0] === "_") { continue; }
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
     * @returns {Parameter}
     */
    static decode(ber) {
        const p = new Parameter();
        ber = ber.getSequence(BER.APPLICATION(1));
    
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
                throw new errors.UnimplementedEmberTypeError(tag);
            }
        }
        return p;
    }
    
}

module.exports = Parameter;