
/****************************************************************************
 * UnimplementedEmberType error
 ***************************************************************************/

class UnimplementedEmberTypeError extends Error {
    constructor(tag) {
        super();
        this.name = this.constructor.name;
        var identifier = (tag & 0xC0) >> 6;
        var value = (tag & 0x1F).toString();
        var tagStr = tag.toString();
        if(identifier == 0) {
            tagStr = "[UNIVERSAL " + value + "]";
        } else if(identifier == 1) {
            tagStr = "[APPLICATION " + value + "]";
        } else if(identifier == 2) {
            tagStr = "[CONTEXT " + value + "]";
        } else {
            tagStr = "[PRIVATE " + value + "]";
        }
        this.message = "Unimplemented EmBER type " + tagStr;
    }
}

module.exports.UnimplementedEmberTypeError = UnimplementedEmberTypeError;


class ASN1Error extends Error {
    constructor(message) {
        super(message);
    }
}

module.exports.ASN1Error = ASN1Error;

class EmberAccessError extends Error {
    constructor(message) {
        super(message);
    }
}

module.exports.EmberAccessError = EmberAccessError;

class EmberTimeoutError extends Error {
    constructor(message) {
        super(message);
    }
}

module.exports.EmberTimeoutError = EmberTimeoutError;

class InvalidCommand extends Error {
    /**
     * 
     * @param {number} number 
     */
    constructor(number) {
        super(`Invalid command ${number}`);
    }
}

module.exports.InvalidCommand = InvalidCommand;

class MissingElementNumber extends Error {
    constructor() {
        super("Missing element number");
    }
}

module.exports.MissingElementNumber = MissingElementNumber;

class MissingElementContents extends Error {
    /**
     * 
     * @param {string} path 
     */
    constructor(path) {
        super(`Missing element contents at ${path}`);
    }
}

module.exports.MissingElementContents = MissingElementContents;

class UnknownElement extends Error {
    /**
     * 
     * @param {string} path 
     */
    constructor(path) {
        super(`No element at path ${path}`);
    }
}

module.exports.UnknownElement = UnknownElement;

class InvalidRequest extends Error {
    constructor() {
        super("Invalid Request");
    }
}

module.exports.InvalidRequest = InvalidRequest;

class InvalidRequestFormat extends Error {
    /**
     * 
     * @param {string} path 
     */
    constructor(path) {
        super(`Invalid Request Format with path ${path}`);
    }
}

module.exports.InvalidRequestFormat = InvalidRequestFormat;

class InvalidEmberNode extends Error {
    /**
     * 
     * @param {string} path 
     * @param {string} info 
     */
    constructor(path="unknown", info="") {
        super(`Invalid Ember Node at ${path}: ${info}`);
    }
}
module.exports.InvalidEmberNode = InvalidEmberNode;

class InvalidEmberResponse extends Error {
    /**
     * 
     * @param {string} req 
     */
    constructor(req) {
        super(`Invalid Ember Response to ${req}`);
    }
}
module.exports.InvalidEmberResponse = InvalidEmberResponse;

class PathDiscoveryFailure extends Error {
    /**
     * 
     * @param {string} path 
     */
    constructor(path) {
        super(`Failed path discovery at ${path}`);
    }
}
module.exports.PathDiscoveryFailure = PathDiscoveryFailure;

class InvalidSourcesFormat extends Error {
    constructor() {
        super("Sources should be an array");
    }
}
module.exports.InvalidSourcesFormat = InvalidSourcesFormat;

class InvalidBERFormat extends Error {
    /**
     * 
     * @param {string} info 
     */
    constructor(info="") {
        super(`Invalid BER format: ${info}`);
    }
}
module.exports.InvalidBERFormat = InvalidBERFormat;

class InvalidResultFormat extends Error {
    /**
     * 
     * @param {string} info 
     */
    constructor(info="") {
        super(`Invalid Result format: ${info}`);
    }
}
module.exports.InvalidResultFormat = InvalidResultFormat;

class InvalidMatrixSignal extends Error {
    /**
     * 
     * @param {number} value 
     * @param {string} info 
     */
    constructor(value, info) {
        super(`Invalid Matrix Signal ${value}: ${info}`);
    }
}
module.exports.InvalidMatrixSignal = InvalidMatrixSignal;