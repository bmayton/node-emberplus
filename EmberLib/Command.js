"use strict";
const Enum = require('enum');
const {COMMAND_GETDIRECTORY, COMMAND_INVOKE} = require("./constants");
const BER = require('../ber.js');
const Invocation = require("./Invocation");
const errors = require("../Errors");
const ElementInterface = require("./ElementInterface");

const FieldFlags = new Enum({
    sparse: -2,
    all: -1,
    default: 0,
    identifier: 1,
    description: 2,
    tree: 3,
    value: 4,
    connections: 5
});

class Command extends ElementInterface{
    /**
     * 
     * @param {number} number 
     */
    constructor(number) {
        super();
        this.number = number;
        if(number == COMMAND_GETDIRECTORY) {
            this.fieldFlags = FieldFlags.all;
        }
    }

    /**
     * @returns {boolean}
     */
    isCommand() {
        return true;
    }
    
    /**
     * 
     * @param {BER} ber 
     */
    encode(ber) {
        ber.startSequence(Command.BERID);
    
        ber.startSequence(BER.CONTEXT(0));
        ber.writeInt(this.number);
        ber.endSequence(); // BER.CONTEXT(0)
    
        if (this.number === COMMAND_GETDIRECTORY && this.fieldFlags) {
            ber.startSequence(BER.CONTEXT(1));
            ber.writeInt(this.fieldFlags.value);
            ber.endSequence();
        }
    
        if (this.number === COMMAND_INVOKE && this.invocation) {
            ber.startSequence(BER.CONTEXT(2));
            this.invocation.encode(ber);
            ber.endSequence();
        }
        // TODO: options
    
        ber.endSequence(); // BER.APPLICATION(2)
    }

    /**
     * @returns {number}
     */
    getNumber() {
        return this.number;
    }

    /**
     * 
     */
    toJSON() {
        return {
            number: this.number,
            fieldFlags: this.fieldFlags,
            invocation: this.invocation == null ? null : this.invocation.toJSON()
        };
    }
    
    /**
     * 
     * @param {BER} ber 
     * @returns {Command}
     */
    static decode(ber) {
        const c = new Command();
        ber = ber.getSequence(Command.BERID);
    
        while(ber.remain > 0) {
            let tag = ber.peek();
            let seq = ber.getSequence(tag);
            if(tag == BER.CONTEXT(0)) {
                c.number = seq.readInt();
            }
            else if(tag == BER.CONTEXT(1)) {
                c.fieldFlags = FieldFlags.get(seq.readInt());
            }
            else if(tag == BER.CONTEXT(2)) {
                c.invocation = Invocation.decode(seq);
            }
            else {
                // TODO: options
                throw new errors.UnimplementedEmberTypeError(tag);
            }
        }
    
        return c;
    }

    /**
     * 
     * @param {number} cmd 
     * @param {string} key 
     * @param {string|value|object} value 
     */
    static getCommand(cmd, key, value) {
        const command = new Command(cmd);
        if (key != null) {
            command[key] = value;
        }
        return command;
    }
    
    /**
     * 
     * @param {Invocation} invocation 
     */
    static getInvocationCommand(invocation) {
        return this.getCommand(COMMAND_INVOKE, "invocation", invocation);
    }
    
    /**
     * @returns {number}
     */
    static get BERID() {
        return BER.APPLICATION(2);
    }
}

module.exports = Command;