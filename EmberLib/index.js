const {Subscribe,COMMAND_SUBSCRIBE,Unsubscribe,COMMAND_UNSUBSCRIBE,
    GetDirectory,COMMAND_GETDIRECTORY,Invoke,COMMAND_INVOKE, COMMAND_STRINGS} = require("./constants");
const BER = require('../ber.js');
const Errors = require("../Errors");
const TreeNode = require("./TreeNode");    
const Command = require("./Command");
const Function =  require("./Function");
const FunctionArgument = require("./FunctionArgument");
const FunctionContent = require("./FunctionContent");
const Invocation = require("./Invocation");
const InvocationResult = require("./InvocationResult");
const Label = require("./Label");
const Matrix = require("./Matrix");
const MatrixNode = require("./MatrixNode");
const MatrixMode = require("./MatrixMode");
const MatrixType = require("./MatrixType");
const MatrixContents = require("./MatrixContents");
const MatrixConnection = require("./MatrixConnection");
const MatrixOperation = require("./MatrixOperation");
const MatrixDisposition = require("./MatrixDisposition");
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
const StringIntegerPair = require("./StringIntegerPair");
const StringIntegerCollection = require("./StringIntegerCollection");
const StreamFormat = require("./StreamFormat");
const StreamDescription = require("./StreamDescription");
const StreamCollection = require("./StreamCollection");
const Template = require("./Template");
const TemplateElement = require("./TemplateElement");
const QualifiedTemplate = require("./QualifiedTemplate");

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
                throw new Errors.UnimplementedEmberTypeError(tag);
            }
        }
        else if (tag === BER.CONTEXT(0)) {
            // continuation of previous message
            try {
                var rootReader = ber.getSequence(BER.CONTEXT(0));
                return childDecode(rootReader)
            }
            catch (e) {
                return r;
            }
        }          
        else {
            throw new Errors.UnimplementedEmberTypeError(tag);
        }
    }
    return r;
}

const TreeNodeDecoders = {
    [Parameter.BERID]: Parameter.decode,
    [Node.BERID]: Node.decode,
    [Command.BERID]: Command.decode,
    [QualifiedParameter.BERID]: QualifiedParameter.decode,
    [QualifiedNode.BERID]: QualifiedNode.decode,
    [MatrixNode.BERID]: MatrixNode.decode,
    [QualifiedMatrix.BERID]: QualifiedMatrix.decode,
    [Function.BERID]: Function.decode,
    [QualifiedFunction.BERID]: QualifiedFunction.decode,
    [Template.BERID]: Template.decode,
    [QualifiedTemplate.BERID]: QualifiedTemplate
};

const childDecode = function(ber) {
    const tag = ber.peek();
    const decode = TreeNodeDecoders[tag];
    if (decode == null) {
        throw new Errors.UnimplementedEmberTypeError(tag);
    }
    else {
        return decode(ber);
    }
}

TreeNode.decode = childDecode;

const DecodeBuffer = function (packet) {
    const ber = new BER.Reader(packet);
    return rootDecode(ber);
};

module.exports = {
    Command,
    COMMAND_STRINGS,
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
    Matrix,
    MatrixNode,
    MatrixMode,
    MatrixType,
    MatrixContents,
    MatrixConnection,
    MatrixDisposition,
    MatrixOperation,
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
    QualifiedTemplate,
    StreamFormat,
    StreamDescription,
    StreamCollection,
    StringIntegerPair,
    StringIntegerCollection,
    Template,
    TemplateElement,
    Subscribe,COMMAND_SUBSCRIBE,
    Unsubscribe,COMMAND_UNSUBSCRIBE,
    GetDirectory,COMMAND_GETDIRECTORY,
    Invoke,COMMAND_INVOKE
}