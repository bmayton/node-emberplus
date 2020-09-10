"use strict";

const Matrix = require("./Matrix");
const MatrixContents = require("./MatrixContents");
const QualifiedMatrix = require("./QualifiedMatrix");
const BER = require('../ber.js');
const errors = require("../Errors");

class MatrixNode extends Matrix {
    constructor(number = undefined) {
        super();
        this.number = number;
    }

    /**
     * 
     * @param {BER} ber 
     */
    encode(ber) {
        ber.startSequence(MatrixNode.BERID);
    
        ber.startSequence(BER.CONTEXT(0));
        ber.writeInt(this.number);
        ber.endSequence(); // BER.CONTEXT(0)
    
        if(this.contents != null) {
            ber.startSequence(BER.CONTEXT(1));
            this.contents.encode(ber);
            ber.endSequence(); // BER.CONTEXT(1)
        }
    
        this.encodeChildren(ber);
        this.encodeTargets(ber);
        this.encodeSources(ber);
        this.encodeConnections(ber);
        
        ber.endSequence(); // BER.APPLICATION(3)
    }



    /**
     * 
     * @param {boolean} complete
     * @returns {MatrixNode}
     */
    getMinimal(complete = false) {
        const number = this.getNumber();
        const m = new MatrixNode(number);
        if (complete) {
            if (this.contents != null) {
                m.contents = this.contents;
            }
            if (this.targets != null) {
                m.targets = this.targets;
            }
            if (this.sources != null) {
                m.sources = this.sources;
            }
            if (this.connections != null) {
                m.connections = this.connections;
            }
        }
        return m;
    }

    /**
     * @returns {QualifiedMatrix}
     */
    toQualified() {
        const qm = new QualifiedMatrix(this.getPath());
        qm.update(this);
        return qm;
    }

    /**
     * 
     * @param {BER} ber
     * @returns {MatrixNode}
     */
    static decode(ber) {
        const m = new MatrixNode();
        ber = ber.getSequence(MatrixNode.BERID);
        while (ber.remain > 0) {
            let tag = ber.peek();
            let seq = ber.getSequence(tag);
            if (tag == BER.CONTEXT(0)) {
                m.number = seq.readInt();
            }
            else if (tag == BER.CONTEXT(1)) {
                m.contents = MatrixContents.decode(seq);
    
            } else if (tag == BER.CONTEXT(2)) {
                m.decodeChildren(seq);
            } else if (tag == BER.CONTEXT(3)) {
                m.targets = Matrix.decodeTargets(seq);
            } else if (tag == BER.CONTEXT(4)) {
                m.sources = Matrix.decodeSources(seq);
            } else if (tag == BER.CONTEXT(5)) {
                m.connections = Matrix.decodeConnections(seq);
            }
            else {
                throw new errors.UnimplementedEmberTypeError(tag);
            }
        }
        return m;
    }

    /**
     * @returns {number}
     */
    static get BERID() {
        return BER.APPLICATION(13);
    }
}

module.exports = MatrixNode;