const {Subscribe,COMMAND_SUBSCRIBE,Unsubscribe,COMMAND_UNSUBSCRIBE,
    GetDirectory,COMMAND_GETDIRECTORY,Invoke,COMMAND_INVOKE} = require("./constants");
const BER = require('../ber.js');
const errors = require("../errors");
const TreeNode = require("./TreeNode");    
const Command = require("./Command");
const Function =  require("./Function");
const FunctionArgument = require("./FunctionArgument");
const FunctionContent = require("./FunctionContent");
const Invocation = require("./Invocation");
const InvocationResult = require("./InvocationResult");
const Label = require("./Label");
const MatrixNode = require("./MatrixNode");
const MatrixMode = require("./MatrixMode");
const MatrixType = require("./MatrixType");
const MatrixContents = require("./MatrixContents");
const MatrixConnection = require("./MatrixConnection");
const Matrixoperation = require("./MatrixOperation");
const Node = require("./Node");
const NodeContents = require("./NodeContents");
const Parameter = require("./Parameter");
const ParameterContents = require("./ParameterContents");
const ParameterAccess = require("./ParameterAccess");
const ParameterType = require("./ParameterType").ParameterType;
const QualifiedFunction = require("./QualifiedFunction");
const QualifiedMatrix = require("./QualifiedMatrix");
const QualifiedNode = require("./QualifiedNode");
const QualifiedParameter = require("./QualifiedParameter");

const rootDecode = function(ber) {
    const r = new TreeNode();
    let tag = undefined;
    while(ber.remain > 0) {
        tag = ber.peek();
        if (tag === BER.APPLICATION(0)) {
            ber = ber.getSequence(BER.APPLICATION(0));
            tag = ber.peek();

            if (tag === BER.APPLICATION(11)) {
                const seq = ber.getSequence(BER.APPLICATION(11));                
                while (seq.remain > 0) {
                    try {
                        const rootReader = seq.getSequence(BER.CONTEXT(0));
                        while (rootReader.remain > 0) {
                            r.addElement(childDecode(rootReader));
                        }
                    }
                    catch (e) {
                        throw e;
                    }
                }
            } 
            else if (tag === BER.APPLICATION(23)) { // InvocationResult BER.APPLICATION(23)
                return InvocationResult.decode(ber)
            }
            else {
                // StreamCollection BER.APPLICATION(6)
                // InvocationResult BER.APPLICATION(23)
                throw new errors.UnimplementedEmberTypeError(tag);
            }
        }
        else if (tag === BER.CONTEXT(0)) {
            // continuation of previous message
            try {
                var rootReader = ber.getSequence(BER.CONTEXT(0));
                return Element.decode(rootReader)
            }
            catch (e) {
                return r;
            }
        }          
        else {
            throw new errors.UnimplementedEmberTypeError(tag);
        }
    }
    return r;
}

const childDecode = function(ber) {
    const tag = ber.peek();
    if (tag == BER.APPLICATION(1)) {
        return Parameter.decode(ber);
    } else if(tag == BER.APPLICATION(3)) {
        return Node.decode(ber);
    } else if(tag == BER.APPLICATION(2)) {
        return Command.decode(ber);
    } else if(tag == BER.APPLICATION(9)) {
        return QualifiedParameter.decode(ber);
    } else if(tag == BER.APPLICATION(10)) {
        return QualifiedNode.decode(ber);
    } else if(tag == BER.APPLICATION(13)) {
        return MatrixNode.decode(ber);
    } else if(tag == BER.APPLICATION(17)) {
        return QualifiedMatrix.decode(ber);
    } else if(tag == BER.APPLICATION(19)) {
        return Function.decode(ber);
    } else if (tag == BER.APPLICATION(20)) {
        return QualifiedFunction.decode(ber);
    } else if(tag == BER.APPLICATION(24)) {
        // Template
        throw new errors.UnimplementedEmberTypeError(tag);
    } else {
        throw new errors.UnimplementedEmberTypeError(tag);
    }
}

TreeNode.decode = childDecode;

const DecodeBuffer = function (packet) {
    const ber = new BER.Reader(packet);
    return TreeNode.decode(ber);
};

module.exports = {
    Command,
    childDecode: childDecode,
    rootDecode: rootDecode,
    DecodeBuffer,
    Root: TreeNode,
    Function,
    FunctionArgument,
    FunctionContent,
    Invocation,
    InvocationResult,
    Label,
    MatrixNode,
    MatrixMode,
    MatrixType,
    MatrixContents,
    MatrixConnection,
    Matrixoperation,
    Node,
    NodeContents,
    Parameter,
    ParameterContents,
    ParameterAccess,
    ParameterType,
    QualifiedFunction ,
    QualifiedMatrix,
    QualifiedNode,
    QualifiedParameter,
    Subscribe,COMMAND_SUBSCRIBE,
    Unsubscribe,COMMAND_UNSUBSCRIBE,
    GetDirectory,COMMAND_GETDIRECTORY,
    Invoke,COMMAND_INVOKE
}