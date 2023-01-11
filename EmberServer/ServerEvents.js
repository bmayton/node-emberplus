"use strict";

const Enum = require('enum');

const Types = new Enum({
    UNKNOWN: 0,
    SETVALUE: 1,
    GETDIRECTORY: 2,
    SUBSCRIBE: 3,
    UNSUBSCRIBE: 4,
    INVOKE: 5,
    MATRIX_CONNECTION: 6
});

class ServerEvents {
    /**
     * 
     * @param {string} txt
     * @param {number} type=0
     */
    constructor(txt, type=Types.UNKNOWN) {
        /** @type {string} */
        this._txt = txt;
        /** @type {number} */
        this._type = type;
        this._timestamp = Date.now();
    }

    /**
     * @returns {number}
     */
    get type() {
        return this._type;
    }

    /**
     * @returns {number}
     */
    get timestamp() {
        return this._timestamp;
    }

    /**
     * @returns {string}
     */
    toString() {
        return this._txt;
    }

    /**
     * @returns {Enum}
     */
    static get Types() {
        return Types;
    }

    /**
     * 
     * @param {number} identifier 
     * @param {string} path 
     * @param {string} src 
     */
    static SETVALUE(identifier,path, src) {
        return new ServerEvents(`set value for ${identifier}(path: ${path}) from ${src}`, Types.SETVALUE);
    }

    /**
     * 
     * @param {number} identifier 
     * @param {string} path 
     * @param {string} src 
     */
    static GETDIRECTORY(identifier,path, src) {
        return new ServerEvents(`getdirectory to ${identifier}(path: ${path}) from ${src}`, Types.GETDIRECTORY);
    }

    /**
     * 
     * @param {number} identifier 
     * @param {string} path 
     * @param {string} src 
     */
    static SUBSCRIBE(identifier,path, src) {
        return new ServerEvents(`subscribe to ${identifier}(path: ${path}) from ${src}`, Types.SUBSCRIBE);
    }

    /**
     * 
     * @param {number} identifier 
     * @param {string} path 
     * @param {string} src 
     */
    static UNSUBSCRIBE(identifier,path, src) {
        return new ServerEvents(`unsubscribe to ${identifier}(path: ${path}) from ${src}`, Types.UNSUBSCRIBE);
    }

    /**
     * 
     * @param {number} identifier 
     * @param {string} path 
     * @param {string} src 
     */
    static INVOKE(identifier,path, src) {
        return new ServerEvents(`invoke to ${identifier}(path: ${path}) from ${src}`, Types.INVOKE);
    }

    /**
     * 
     * @param {number} identifier 
     * @param {string} path 
     * @param {string} src 
     * @param {number} target
     * @param {number[]} sources
     */
    static MATRIX_CONNECTION(identifier, path, src, target, sources) {
        const sourcesInfo = sources == null || sources.length === 0 ? "empty" : sources.toString();
        return new ServerEvents(
            `Matrix connection to ${identifier}(path: ${path}) target ${target} connections: ${sourcesInfo} from ${src}`,
            Types.MATRIX_CONNECTION
        );
    }
}

module.exports = ServerEvents;