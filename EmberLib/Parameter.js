"use strict";

const TreeNode = require("./TreeNode");
const QualifiedParameter = require("./QualifiedParameter");
const BER = require('../ber.js');
const ParameterContents = require("./ParameterContents");

class Parameter extends TreeNode {
    /**
     * 
     * @param {number} number 
     */
    constructor(number) {
        super();
        this.number = number;
    }

    isParameter() {
        return true;
    }

    /**
     * 
     * @param {BER} ber 
     */
    encode(ber) {
        ber.startSequence(BER.APPLICATION(1));
    
        ber.writeIfDefined(this.number, ber.writeInt, 0);
    
        if(this.contents != null) {
            ber.startSequence(BER.CONTEXT(1));
            this.contents.encode(ber);
            ber.endSequence();
        }
    
        this.encodeChildren(ber);
    
        ber.endSequence();
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
        if ((other !== undefined) && (other.contents !== undefined)) {
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
        if (DEBUG) { console.log("Parameter", p); }
        return p;
    }
    
}

module.exports = Parameter;