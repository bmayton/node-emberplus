"use strict";
const TreeNode = require("./TreeNode");
const QualifiedFunction = require("./QualifiedFunction");
const BER = require('../ber.js');

class Function extends TreeNode {
    constructor(number, func) {
        super();
        this.number = number;
        this.func = func;
        this._seqID = BER.APPLICATION(19);
    }

    /**
     * @returns {boolean}
     */
    isFunction() {
        return true;
    }

    /**
     * @returns {Root}
     */
    invoke() {
        return this.getTreeBranch(undefined, (m) => {
            m.addChild(new Command(COMMAND_INVOKE))
        });
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
        ber = ber.getSequence(BER.APPLICATION(19));
    
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
                throw new errors.UnimplementedEmberTypeError(tag);
            }
        }
        return f;
    }
}

module.exports = Function;