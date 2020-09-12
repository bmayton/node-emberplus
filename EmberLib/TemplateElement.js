"use strict";

const BER = require('../ber.js');
const Parameter = require("./Parameter");
const Node = require("./Node");
const MatrixNode = require("./MatrixNode");
const Function = require("./Function");
const Errors = require("../Errors");

/*
TemplateElement ::=
    CHOICE {
        parameter Parameter,
        node Node,
        matrix Matrix,
        function Function
    }
*/
class TemplateElement {
    /**
     * 
     * @param {Node|Function|Parameter|MatrixNode} ber 
     */
    static decode(ber) {
        const tag = ber.peek();
        if (tag == BER.APPLICATION(1)) {
            return Parameter.decode(ber);
        } else if(tag == BER.APPLICATION(3)) {
            return Node.decode(ber);
        } else if(tag == BER.APPLICATION(19)) {
            return Function.decode(ber);
        } else if(tag == BER.APPLICATION(13)) {
            return MatrixNode.decode(ber);
        }
        else {
            throw new Errors.UnimplementedEmberTypeError(tag);
        }
    }

    /**
     * 
     * @param {Template|QualifiedTemplate} template 
     * @param {number} tag 
     * @param {BER} ber 
     */
    static decodeContent(template, tag, ber) {
        if(tag == BER.CONTEXT(1)) {
            template.element = TemplateElement.decode(ber);
        } else if(tag == BER.CONTEXT(2)) {
            template.description = ber.readString(BER.EMBER_STRING);
        } else {
            throw new Errors.UnimplementedEmberTypeError(tag);
        }
    }
    /**
     * 
     * @param {Template|QualifiedTemplate} template 
     * @param {BER} ber 
     */
    static encodeContent(template, ber) {
        if(template.element != null) {
            ber.startSequence(BER.CONTEXT(1));
            template.element.encode(ber);
            ber.endSequence();
        }
        
        if (template.description != null) {
            ber.startSequence(BER.CONTEXT(2));
            ber.writeString(template.description, BER.EMBER_STRING);
            ber.endSequence();
        }
    }
}

module.exports = TemplateElement;