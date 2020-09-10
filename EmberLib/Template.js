"use strict";

const Element = require("./Element");
const QualifiedTemplate = require("./QualifiedTemplate");
const BER = require('../ber.js');
const TemplateElement = require("./TemplateElement");
const Errors = require("../Errors");

class Template extends Element {
    /**
     * 
     * @param {number} number
     * @param {Node|Function|MatrixNode|Parameter} element
     */
    constructor(number, element) {
        super();
        this.number = number;
        this.element = element;
        this._seqID = Template.BERID;
    }

    /**
     * 
     * @param {BER} ber 
     */
    encode(ber) {
        ber.startSequence(Template.BERID);
        this.encodeNumber(ber);
        TemplateElement.encodeContent(this, ber);
        ber.endSequence();
    }

    /**
     * @returns {boolean}
     */
    isTemplate() {
        return true;
    }

    /**
     * @returns {QualifiedParameter}
     */
    toQualified() {
        const qp = new QualifiedTemplate(this.getPath());
        qp.update(this);
        return qp;
    }

    /**
     * 
     * @param {Template} other 
     */
    update(other) {
        this.element = other.element;
    }

    /**
     * 
     * @param {BER} ber
     * @returns {Template}
     */
    static decode(ber) {
        const template = new Template();
        ber = ber.getSequence(Template.BERID);
        while(ber.remain > 0) {
            let tag = ber.peek();
            let seq = ber.getSequence(tag);
            if(tag == BER.CONTEXT(0)) {
                template.number = seq.readInt();
            } else {
                TemplateElement.decodeContent(template, tag, seq);
            }
        }
        return template;
    }
    
    /**
     * @returns {number}
     */
    static get BERID() {
        return BER.APPLICATION(24);
    }
}

module.exports = Template;