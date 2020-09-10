const expect = require("expect");
const { S101Client } = require("../EmberSocket");
const BER = require('../ber.js');
const Errors = require('../Errors.js');
const EmberLib = require("../EmberLib");
const {ParameterTypefromBERTAG, ParameterTypetoBERTAG} = require("../EmberLib/ParameterType");

const s101Buffer = Buffer.from("fe000e0001c001021f026082008d6b820089a0176a15a0050d03010201a10c310aa0080c066c6162656c73a01b6a19a0050d03010202a110310ea00c0c0a706172616d6574657273a051714fa0050d03010203a1463144a0080c066d6174726978a403020104a503020104aa183016a0147212a0050d03010201a1090c075072696d617279a203020102a303020101a8050d03010202a903020101f24cff", "hex");
const errorBuffer = Buffer.from("76fe000e0001c001021f026082008d6b820089a0176a15a0050d03010201a10c310aa0080c066c6162656c73a01b6a19a0050d03010202a110310ea00c0c0a706172616d6574657273a051714fa0050d03010203a1463144a0080c066d6174726978a403020104a503020104aa183016a0147212a0050d03010201a1090c075072696d617279a203020102a303020101a8050d03010202a903020101f24cff", "hex");
const identifier = "node_identifier";
const description = "node_description";

describe("Ember", () => {
    describe("generic", () => {
        let client;

        beforeEach(() => {
            client = new S101Client();
        });

        it("should parse S101 message without error", (done) => {
            client.on("emberPacket", () => {
                done();
            });
            client.on("error", e => {
                // eslint-disable-next-line no-console
                console.log(e);
                expect(e).toBeUndefined();
                done();
            });
            client.codec.dataIn(s101Buffer);
        });

        it("should handle Errors in message", () => {
            var ber = new BER.Reader(errorBuffer);
            expect(() => EmberLib.Root.decode(ber)).toThrow(Errors.UnimplementedEmberTypeError);
        });
        it("Should have a toJSON()", () => {
            const node = new EmberLib.Node();
            node.addChild(new EmberLib.Node(0));
            node.getElementByNumber(0).addChild(new EmberLib.Parameter(1));
            const matrix = new EmberLib.MatrixNode(2);
            matrix.targets = [0,3,6,7];
            matrix.sources = [2,6,8];
            matrix.contents = new EmberLib.MatrixContents(EmberLib.MatrixType.oneToN, EmberLib.MatrixMode.nonLinear);
            node.getElementByNumber(0).addChild(matrix);
            const js = node.toJSON();
            expect(js).toBeDefined();
            expect(js.elements.length).toBe(1);
            expect(js.elements[0].number).toBe(0);
            expect(js.elements[0].children[0].number).toBe(1);
            expect(js.elements[0].children[1].number).toBe(2);
            expect(js.elements[0].children[1].targets.length).toBe(matrix.targets.length);
        });
        it("should have a getElement()", () => {
            const node = new EmberLib.Node();
            node.addChild(new EmberLib.Node(0));
            let res = node.getElement(0);
            expect(res).toBeDefined();
        });
        it("should have a isCommand(), isRoot() ... functions", () => {
            const root = new EmberLib.Root();
            const node = new EmberLib.Node();
            root.addElement(node);
            expect(node.isCommand()).toBeFalsy();
            expect(node.isRoot()).toBeFalsy();
            expect(node.isStream()).toBeFalsy();
            expect(node.isTemplate()).toBeFalsy();
        });
        it("should have function getElement", () => {
            const node = new EmberLib.Node(0);
            const identifier = "node_identifier";
            const description = "node_description";
            node.contents = new EmberLib.NodeContents(identifier, description);
            const root = new EmberLib.Root();
            root.addElement(node);
            let res = root.getElement(identifier);
            expect(res).toBeDefined();
            expect(res.contents.identifier).toBe(identifier);
        });

        it("should throw error if function getElement called from a node with longer path", () => {
            const root = new EmberLib.Root();
            root.addChild(new EmberLib.Node(0));
            root.getElement(0).addChild(new EmberLib.Node(1));
            root.getElementByPath("0.1").addChild(new EmberLib.Node(1));
            const node = new EmberLib.Node(0);
            root.getElementByPath("0.1.1").addChild(node);
            const identifier = "node_identifier";
            const description = "node_description";
            node.contents = new EmberLib.NodeContents(identifier, description);
            let res = root.getElementByPath("0.1").getElementByPath("0");
            expect(res).toBe(null);

            res = root.getElementByPath("0.1").getElementByPath("0.2.0");
            expect(res).toBe(null);

            res = root.getElementByPath("0.1").getElementByPath("0.1");
            expect(res).toBeDefined();
        });
        it("should have a getRoot function", () => {
            const root = new EmberLib.Root();
            root.addChild(new EmberLib.Node(0));
            root.getElement(0).addChild(new EmberLib.Node(1));
            root.getElementByPath("0.1").addChild(new EmberLib.Node(1));
            const node = new EmberLib.Node(0);
            root.getElementByPath("0.1.1").addChild(node);
            let res = node.getRoot();
            expect(res).toBe(root);
        });
        it("Root should have a toJSON function", () =>{
           const root = new EmberLib.Root();
           expect(root.toJSON()).toEqual({"elements": []});
           root.addChild(new EmberLib.Node(0));
           root.getElement(0).addChild(new EmberLib.Node(1));
           expect(root.toJSON()).toEqual({"elements": [{"children": [{"nodeType": "Node", "number": 1, "path": "0.1"}], "nodeType": "Node", "number": 0, "path": "0"}]});
        });
        it("should have a getDirectory() and accept a callback for subscribers", () => {
            const parameter = new EmberLib.Parameter(0);
            parameter.contents = new EmberLib.ParameterContents(7, "integer");
            let res = parameter.getDirectory(() => {});
            expect(res).toBeDefined();
            expect(parameter._subscribers.size).toBe(1);
        });
        it("should have a getDuplicate function", () => {
            const parameter = new EmberLib.Parameter(0);
            parameter.contents = new EmberLib.ParameterContents("test", "string");
            let res = parameter.getDuplicate();
            expect(res).toBeDefined();

            const qp = new EmberLib.QualifiedParameter("0.1");
            qp.contents = parameter.contents;
            res = qp.getDuplicate();
            expect(res).toBeDefined();
        });
        it("should decode continuation messages", () => {
            const writer = new BER.Writer();
            writer.startSequence(BER.CONTEXT(0));
            const qp = new EmberLib.QualifiedParameter("0.1");
            qp.encode(writer);
            writer.endSequence();
            const res = EmberLib.rootDecode(new BER.Reader(writer.buffer));
            expect(res).toBeDefined();
            expect(res.getElementByPath("0.1")).toBeDefined();
        });
        it("should throw an error if not able to decode root", () => {
            let writer = new BER.Writer();
            writer.startSequence(BER.CONTEXT(0));
            writer.startSequence(BER.CONTEXT(99));
            writer.endSequence();
            writer.endSequence();
            try {
                EmberLib.rootDecode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(error){
                expect(error instanceof Errors.UnimplementedEmberTypeError);
            }

            writer = new BER.Writer();
            writer.startSequence(BER.CONTEXT(99));
            writer.endSequence();
            try {
                EmberLib.rootDecode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(error){
                expect(error instanceof Errors.UnimplementedEmberTypeError);
            }

            writer = new BER.Writer();
            writer.startSequence(BER.APPLICATION(0));
            writer.startSequence(BER.CONTEXT(99));
            writer.endSequence();
            writer.endSequence();
            try {
                EmberLib.rootDecode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(error){
                expect(error instanceof Errors.UnimplementedEmberTypeError);
            }
        });
    });
    describe("Command", () => {
        it("should throw error if unknown context found", () => {
            const writer = new BER.Writer();
            writer.startSequence(BER.APPLICATION(2));
            writer.startSequence(BER.CONTEXT(0));
            writer.writeInt(EmberLib.COMMAND_GETDIRECTORY);
            writer.endSequence(); // BER.CONTEXT(0)
            writer.startSequence(BER.CONTEXT(1));
            writer.writeInt(0);
            writer.endSequence();
            writer.startSequence(BER.CONTEXT(3));
            writer.writeInt(0);
            writer.endSequence();
            writer.endSequence(); // BER.APPLICATION(2)
            try {
                EmberLib.Command.decode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(e) {
                expect(e).not.toBe("Should not succeed");
            }
        });
        it("should have a toJSON", () => {
            const command = new EmberLib.Command(EmberLib.COMMAND_GETDIRECTORY);            
            let jsonCommand = command.toJSON();
            expect(jsonCommand.number).toBe(EmberLib.COMMAND_GETDIRECTORY);
            command.invocation = new EmberLib.Invocation(1, [
                new EmberLib.FunctionArgument(EmberLib.ParameterType.integer, 1, "arg1")
            ]);
            jsonCommand = command.toJSON();
            expect(jsonCommand.invocation.arguments.length).toBe(1);
        });
        it("Should throw an error if unable to decode", () => {
            const writer = new BER.Writer();
            writer.startSequence(EmberLib.Command.BERID);
            writer.startSequence(BER.CONTEXT(99));
            writer.endSequence();
            writer.endSequence();
            try {
                EmberLib.Command.decode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(e) {                
                expect(e instanceof Errors.UnimplementedEmberTypeError).toBeTruthy();
            }
        });
        it("should have a getElementByIdentifier", () => {
            const node = new EmberLib.Node(0);
            const identifier = "node_identifier";
            const description = "node_description";
            node.contents = new EmberLib.NodeContents(identifier, description);
            const root = new EmberLib.Root();
            root.addElement(node);
            let res = root.getElementByIdentifier(identifier);
            expect(res).toBeDefined();
            expect(res.contents.identifier).toBe(identifier);

            res = root.getElementByIdentifier("unknown");
            expect(res).toBe(null);
        });
    });
    describe("Node", () => {
        it("should have an encoder", () => {
            const node = new EmberLib.Node(0);
            const identifier = "node_identifier";
            const description = "node_description";
            node.contents = new EmberLib.NodeContents(identifier, description);
            node.contents.isRoot = true;
            node.contents.isOnline = true;
            node.contents.schemaIdentifiers = "schema1";
            const root = new EmberLib.Node(0);
            root.addChild(node);
            let writer = new BER.Writer();
            root.encode(writer);
            expect(writer.buffer.size).not.toBe(0);
            node.contents.isOnline = null;
            node.contents.identifier = null;
            writer = new BER.Writer();
            root.encode(writer);
            expect(writer.buffer.size).not.toBe(0);
        });
        it("should have a decoder", () => {
            const node = new EmberLib.Node(0);            
            node.contents = new EmberLib.NodeContents(identifier, description);
            node.contents.isRoot = true;
            node.contents.isOnline = true;
            node.contents.schemaIdentifiers = "schema1";
            const writer = new BER.Writer();
            node.encode(writer);
            const n = EmberLib.Node.decode(new BER.Reader(writer.buffer));
            expect(n.number).toBe(node.number);
            expect(n.contents.identifier).toBe(identifier);
            expect(n.contents.description).toBe(description);
        });
        it("Should throw an error if unable to decode", () => {
            const writer = new BER.Writer();
            writer.startSequence(EmberLib.Node.BERID);
            writer.startSequence(BER.CONTEXT(99));
            writer.endSequence();
            writer.endSequence();
            try {
                EmberLib.Node.decode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(e) {                
                expect(e instanceof Errors.UnimplementedEmberTypeError).toBeTruthy();
            }
        });
        it("should throw an error if unable to decode content", () => {
            const writer = new BER.Writer();
            writer.startSequence(BER.EMBER_SET);
            writer.startSequence(BER.CONTEXT(99));
            writer.endSequence();
            writer.endSequence();
            try {
                EmberLib.NodeContents.decode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(e) {  
                expect(e instanceof Errors.UnimplementedEmberTypeError).toBeTruthy();
            }
        });
    });
    describe("Function", () => {
        let func;
        beforeEach(() => {
            func = new EmberLib.Function(0, args => {
                const res = new EmberLib.FunctionArgument();
                res.type = EmberLib.ParameterType.integer;
                res.value = args[0].value + args[1].value;
                return [res];
            });
        });
        it("should be able to encode FunctionArgument with no name", () => {
            const res = new EmberLib.FunctionArgument();
            res.type = EmberLib.ParameterType.integer;
            const writer = new BER.Writer();
            res.encode(writer);
            expect(writer.buffer.length > 0).toBeTruthy();
        });
        it("should throw an Error  if encoding FunctionArgument with no type", () => {
            const res = new EmberLib.FunctionArgument();
            const writer = new BER.Writer();
            try {
                res.encode(writer);
                throw new Error("Should not succeed");
            }
            catch(e) {
                expect(e instanceof Errors.InvalidEmberNode);
            }
        });
        it("should throw an Error  if unable to decode", () => {
            const writer = new BER.Writer();
            try {
                writer.startSequence(EmberLib.Function.BERID);
                writer.startSequence(BER.CONTEXT(99));
                writer.endSequence(); // BER.CONTEXT(0)
                writer.endSequence(); // BER.CONTEXT(0)            
                EmberLib.Function.decode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(e) {
                expect(e instanceof Errors.UnimplementedEmberTypeError);
            }
        });
        it("should return true when calling isFunction", () => {
            expect(func.isFunction()).toBeTruthy();
        });
        it("should have an invoke function", () => {
            const invoke = func.invoke();
            const children = invoke.getChildren();
            expect(children.length).toBe(1);
            expect(children[0].isCommand()).toBeTruthy();
        });
        it("should have a encoder/decoder", () => {
            func.contents = new EmberLib.FunctionContent(identifier, description);
            func.contents.templateReference = "1.2.3";
            func.addChild(new EmberLib.Node(1));
            func.contents.arguments = [ 
                new EmberLib.FunctionArgument(EmberLib.ParameterType.integer,null, "arg1"),
                new EmberLib.FunctionArgument(EmberLib.ParameterType.integer,null, "arg2")
            ];
            func.contents.result = [
                new EmberLib.FunctionArgument(EmberLib.ParameterType.integer,null, "result")
            ];
            let writer = new BER.Writer();
            func.encode(writer);
            let f = EmberLib.Function.decode(new BER.Reader(writer.buffer));
            expect(f.number).toBe(func.number);
            expect(f.contents.identifier).toBe(identifier);
            expect(f.contents.description).toBe(description);
            expect(f.contents.result.length).toBe(1);
            expect(f.contents.templateReference).toBe(func.contents.templateReference);

            writer = new BER.Writer();
            func.contents.identifier = null;
            func.contents.arguments = null;
            func.contents.result = null;
            func.encode(writer);
            f = EmberLib.Function.decode(new BER.Reader(writer.buffer));
            expect(f.number).toBe(func.number);
            expect(f.contents.identifier == null).toBeTruthy();
            expect(f.contents.result == null || f.contents.result.length == 0).toBeTruthy();
        });
        it("should throw an error if unable to decode result", () => {
            const writer = new BER.Writer();
            writer.startSequence(BER.EMBER_SET);
            writer.startSequence(BER.CONTEXT(3));
            writer.startSequence(BER.CONTEXT(99));
            writer.endSequence();
            writer.endSequence();
            writer.endSequence();
            try {
                EmberLib.FunctionContent.decode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(e) {
                expect(e.name).toEqual('InvalidAsn1Error');
            }
        });
        it("should throw an error if unable to decode content", () => {
            const writer = new BER.Writer();
            writer.startSequence(BER.EMBER_SET);
            writer.startSequence(BER.CONTEXT(99));
            writer.endSequence();
            writer.endSequence();
            try {
                EmberLib.FunctionContent.decode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(e) {  
                expect(e instanceof Errors.UnimplementedEmberTypeError).toBeTruthy();
            }
        });
        it("should throw an error if unable to decode FunctionArgument", () => {
            const writer = new BER.Writer();
            writer.startSequence(EmberLib.FunctionArgument.BERID);
            writer.startSequence(BER.CONTEXT(99));
            writer.endSequence();
            writer.endSequence();
            try {
                EmberLib.FunctionArgument.decode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(e) { 
                expect(e instanceof Errors.UnimplementedEmberTypeError).toBeTruthy();
            }
        });
    });
    describe("Parameter", () => {
        it("should through an error if decoding unknown parameter type", () => {
            try {
                ParameterTypefromBERTAG(99);
            }
            catch(e) {
                expect(e instanceof Errors.InvalidBERFormat).toBeTruthy();
            }
            try {
                ParameterTypetoBERTAG(99);
            }
            catch(e) {
                expect(e instanceof Errors.InvalidEmberNode).toBeTruthy();
            }
        });
        it("should have an update function", () => {
            const parameter = new EmberLib.Parameter(0);
            const VALUE = 1;
            parameter.contents = new EmberLib.ParameterContents(VALUE, "integer");
            const newParameter = new EmberLib.Parameter(0);
            const NEW_VALUE = VALUE + 1;
            newParameter.contents = new EmberLib.ParameterContents(NEW_VALUE, "integer");
            parameter.update(newParameter);
            expect(parameter.contents.value).toBe(NEW_VALUE);
        });
        it("should have setValue function", () => {
            const parameter = new EmberLib.Parameter(0);
            const VALUE = 1;
            parameter.contents = new EmberLib.ParameterContents(VALUE, "integer");
            let NEW_VALUE = VALUE + 1;
            let setVal = parameter.setValue(NEW_VALUE);
            expect(setVal.contents.value).toBe(NEW_VALUE);
            NEW_VALUE = NEW_VALUE + 1;
            setVal = parameter.setValue(new EmberLib.ParameterContents(NEW_VALUE));
            expect(setVal.contents.value).toBe(NEW_VALUE);
        });
        it("should have decoder function", () => {
            const parameter = new EmberLib.Parameter(0);
            const VALUE = 1;
            parameter.contents = new EmberLib.ParameterContents(VALUE, "integer");
            parameter.contents.minimum = 0;
            parameter.contents.maximum = 100;
            parameter.contents.access = EmberLib.ParameterAccess.readWrite;
            parameter.contents.format = "db";
            parameter.contents.factor = 10;
            parameter.contents.isOnline = true;
            parameter.contents.formula = "x10";
            const STEP = 2;
            parameter.contents.step = STEP;
            const DEFAULT = 0;
            parameter.contents.default = DEFAULT;
            parameter.contents.type = EmberLib.ParameterType.integer;
            parameter.contents.enumeration = "enumeration";
            parameter.contents.description = "description";
            parameter.contents.enumMap = new EmberLib.StringIntegerCollection();
            const KEY = "one";
            const KEY_VAL = 1;
            parameter.contents.enumMap.addEntry(KEY, new EmberLib.StringIntegerPair(KEY, KEY_VAL));
            parameter.contents.streamDescriptor = new EmberLib.StreamDescription();
            parameter.contents.streamDescriptor.format = EmberLib.StreamFormat.signedInt8;            
            const OFFSET = 4;
            parameter.contents.streamDescriptor.offset = OFFSET;

            const SCHEMA = "schema";
            parameter.contents.schemaIdentifiers = SCHEMA;
            const node = new EmberLib.Node(0);
            parameter.addChild(node);
            const writer = new BER.Writer();
            parameter.encode(writer);
            const newParameter = EmberLib.Parameter.decode(new BER.Reader(writer.buffer));
            expect(newParameter.getChildren().length).toBe(1);
            expect(newParameter.contents.streamDescriptor.offset).toBe(OFFSET);
            expect(newParameter.contents.step).toBe(STEP);
            expect(newParameter.contents.default).toBe(DEFAULT);
            expect(newParameter.contents.enumMap.get(KEY).value).toBe(KEY_VAL);
            expect(newParameter.contents.schemaIdentifiers).toBe(SCHEMA);
        });
        it("should support type real", () => {
            const parameter = new EmberLib.Parameter(0);
            const VALUE = 1.1;
            parameter.contents = new EmberLib.ParameterContents(VALUE, "real");
            const writer = new BER.Writer();
            parameter.encode(writer);
            const newParameter = EmberLib.Parameter.decode(new BER.Reader(writer.buffer));
            expect(newParameter.contents.value).toBe(VALUE);
        });
        it("should support type string", () => {
            const parameter = new EmberLib.Parameter(0);
            const VALUE ="string support";
            parameter.contents = new EmberLib.ParameterContents(VALUE, "string");
            const writer = new BER.Writer();
            parameter.encode(writer);
            const newParameter = EmberLib.Parameter.decode(new BER.Reader(writer.buffer));
            expect(newParameter.contents.value).toBe(VALUE);
        });
        it("should support type boolean", () => {
            const parameter = new EmberLib.Parameter(0);
            const VALUE = true;
            parameter.contents = new EmberLib.ParameterContents(VALUE, "boolean");
            const writer = new BER.Writer();
            parameter.encode(writer);
            const newParameter = EmberLib.Parameter.decode(new BER.Reader(writer.buffer));
            expect(newParameter.contents.value).toBe(VALUE);
        });
        it("should throw an error if fails to decode", () => {
            const writer = new BER.Writer();
            writer.startSequence(EmberLib.Parameter.BERID);
            writer.startSequence(BER.CONTEXT(99));
            writer.endSequence();
            writer.endSequence();
            try {
                EmberLib.Parameter.decode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(e) {                
                expect(e instanceof Errors.UnimplementedEmberTypeError).toBeTruthy();
            }
        });
        it("should throw an error if fails to decode StringIntegerPair", () => {
            const writer = new BER.Writer();
            writer.startSequence(EmberLib.StringIntegerPair.BERID);
            writer.startSequence(BER.CONTEXT(99));
            writer.endSequence();
            writer.endSequence();
            try {
                EmberLib.StringIntegerPair.decode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(e) {                
                expect(e instanceof Errors.UnimplementedEmberTypeError).toBeTruthy();
            }
        });
        it("should throw an error if fails to decode StringIntegerCollection", () => {
            const writer = new BER.Writer();
            writer.startSequence(EmberLib.StringIntegerCollection.BERID);
            writer.startSequence(BER.CONTEXT(99));
            writer.endSequence();
            writer.endSequence();
            try {
                EmberLib.StringIntegerCollection.decode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(e) {     
                expect(e instanceof Errors.UnimplementedEmberTypeError).toBeTruthy();
            }
        });
        it("should throw an error if fails to decode ParameterContents", () => {
            const writer = new BER.Writer();
            writer.startSequence(BER.EMBER_SET);
            writer.startSequence(BER.CONTEXT(99));
            writer.endSequence();
            writer.endSequence();
            try {
                EmberLib.ParameterContents.decode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(e) {     
                expect(e instanceof Errors.UnimplementedEmberTypeError).toBeTruthy();
            }
        });
    });
    describe("Matrix", () => {
        describe("validateConnection", () => {
            const PATH = "0.0.0";
            let matrixNode;
            let qMatrixNode;
            const TARGETCOUNT = 5;
            const SOURCECOUNT = 5;
            beforeEach(() => {
                matrixNode = new EmberLib.MatrixNode(0);
                qMatrixNode = new EmberLib.QualifiedMatrix(PATH);                
                matrixNode.contents = new EmberLib.MatrixContents(
                    EmberLib.MatrixType.onetoN, 
                    EmberLib.MatrixMode.linear
                );
                matrixNode.contents.identifier = "matrix";
                matrixNode.contents.description = "matrix";
                matrixNode.contents.targetCount = TARGETCOUNT;
                matrixNode.contents.sourceCount = SOURCECOUNT;
                qMatrixNode.contents = matrixNode.contents;
            });
            it("should have encoder/decoder", () => {
                matrixNode.addChild(new EmberLib.Node(0));
                let writer = new BER.Writer();
                matrixNode.encode(writer);
                let newMatrixNode = EmberLib.MatrixNode.decode(new BER.Reader(writer.buffer));
                expect(newMatrixNode.getChildren().length).toBe(1);

                writer = new BER.Writer();
                qMatrixNode.encode(writer);
                newMatrixNode = EmberLib.QualifiedMatrix.decode(new BER.Reader(writer.buffer));
                expect(newMatrixNode.path).toBe(PATH);

                matrixNode.contents.identifier = null;
                matrixNode.contents.type = null;
                matrixNode.contents.mode = null;
                writer = new BER.Writer();
                matrixNode.encode(writer);
                newMatrixNode = EmberLib.MatrixNode.decode(new BER.Reader(writer.buffer));
                expect(newMatrixNode.contents.identifier == null).toBeTruthy();                
                
                writer = new BER.Writer();
                qMatrixNode.encode(writer);
                newMatrixNode = EmberLib.QualifiedMatrix.decode(new BER.Reader(writer.buffer));
                expect(newMatrixNode.contents.identifier == null).toBeTruthy();

                matrixNode.contents = null;
                writer = new BER.Writer();
                matrixNode.encode(writer);
                newMatrixNode = EmberLib.MatrixNode.decode(new BER.Reader(writer.buffer));
                expect(newMatrixNode.contents == null).toBeTruthy();  
                
                qMatrixNode.contents = null;
                writer = new BER.Writer();
                qMatrixNode.encode(writer);
                newMatrixNode = EmberLib.QualifiedMatrix.decode(new BER.Reader(writer.buffer));
                expect(newMatrixNode.contents == null).toBeTruthy();
            });
            it("should throw an error if target is negative", () => {
                try {
                    EmberLib.Matrix.validateConnection(matrixNode, -1, []);
                    throw new Error("Should not succeed");
                }
                catch(e) {
                    expect(e instanceof Errors.InvalidMatrixSignal).toBeTruthy();
                }
            });
            it("should throw an error if source is negative", () => {
                try {
                    EmberLib.Matrix.validateConnection(matrixNode, 0, [-1]);
                    throw new Error("Should not succeed");
                }
                catch(e) {
                    expect(e instanceof Errors.InvalidMatrixSignal).toBeTruthy();
                }
            });
            it("should throw an error if target higher than max target", () => {
                try {
                    EmberLib.Matrix.validateConnection(matrixNode, TARGETCOUNT, [0]);
                    throw new Error("Should not succeed");
                }
                catch(e) {
                    expect(e instanceof Errors.InvalidMatrixSignal).toBeTruthy();
                }
            });
            it("should throw an error if target higher than max target", () => {
                try {
                    EmberLib.Matrix.validateConnection(matrixNode, 0, [SOURCECOUNT]);
                    throw new Error("Should not succeed");
                }
                catch(e) {                    
                    expect(e instanceof Errors.InvalidMatrixSignal).toBeTruthy();
                }
            });
            it("should throw an error if non-Linear Matrix without targets", () => {
                matrixNode.contents.mode = EmberLib.MatrixMode.nonLinear;
                try {
                    EmberLib.Matrix.validateConnection(matrixNode, 0, [0]);
                    throw new Error("Should not succeed");
                }
                catch(e) {        
                    matrixNode.contents.mode = EmberLib.MatrixMode.linear;            
                    expect(e instanceof Errors.InvalidEmberNode).toBeTruthy();
                }
            });
            it("should throw an error if non-Linear Matrix without sources", () => {
                matrixNode.contents.mode = EmberLib.MatrixMode.nonLinear;
                matrixNode.targets = [0, 3];
                try {
                    EmberLib.Matrix.validateConnection(matrixNode, 0, [0]);
                    throw new Error("Should not succeed");
                }
                catch(e) {   
                    matrixNode.contents.mode = EmberLib.MatrixMode.linear;
                    expect(e instanceof Errors.InvalidEmberNode).toBeTruthy();
                }
            });
            it("should throw an error if non-Linear Matrix and not valid target", () => {
                matrixNode.contents.mode = EmberLib.MatrixMode.nonLinear;
                matrixNode.targets = [0, 3];
                matrixNode.sources = [0, 3];
                matrixNode.connections = {
                    0: new EmberLib.MatrixConnection(0)
                }
                const min = matrixNode.getMinimal(true);
                expect(min.sources).toBeDefined();
                try {
                    EmberLib.Matrix.validateConnection(matrixNode, 1, [0]);
                    throw new Error("Should not succeed");
                }
                catch(e) {   
                    matrixNode.contents.mode = EmberLib.MatrixMode.linear;
                    expect(e instanceof Errors.InvalidMatrixSignal).toBeTruthy();
                }
            });
            it("should have getMinimal function", () => {
                matrixNode.contents = null;
                matrixNode.connections = null;
                const min = matrixNode.getMinimal(true);
                expect(min.number).toBe(matrixNode.getNumber());
            });
            it("should throw an error if non-Linear Matrix and not valid source", () => {
                matrixNode.contents.mode = EmberLib.MatrixMode.nonLinear;
                matrixNode.targets = [0, 3];
                matrixNode.sources = [0, 3];
                try {
                    EmberLib.Matrix.validateConnection(matrixNode, 0, [1]);
                    throw new Error("Should not succeed");
                }
                catch(e) {   
                    matrixNode.contents.mode = EmberLib.MatrixMode.linear;                    
                    expect(e instanceof Errors.InvalidMatrixSignal).toBeTruthy();
                }
            });
            it("should not throw an error on valid non-linear connect", () => {
                let error = null;
                matrixNode.contents.mode = EmberLib.MatrixMode.nonLinear;
                matrixNode.targets = [0, 3];
                matrixNode.sources = [0, 3];
                try {
                    EmberLib.Matrix.validateConnection(matrixNode, 0, [0]);                    
                }
                catch(e) {   
                    error = e;
                }
                expect(error == null).toBeTruthy();
            });
            it("should not throw an error if can't decode MatrixContent", () => {
                const writer = new BER.Writer();
                writer.startSequence(BER.EMBER_SET);
                writer.startSequence(BER.CONTEXT(99));
                writer.endSequence();
                writer.endSequence();
                try {
                    EmberLib.MatrixContents.decode(new BER.Reader(writer.buffer));
                    throw new Error("Should not succeed");
                }
                catch(e) {     
                    expect(e instanceof Errors.UnimplementedEmberTypeError).toBeTruthy();
                }
            });
        });
        describe("MatrixUpdate", () => {
            let matrixNode;
            const TARGETCOUNT = 5;
            const SOURCECOUNT = 5;
            beforeEach(() => {
                matrixNode = new EmberLib.MatrixNode(0);
                matrixNode.contents = new EmberLib.MatrixContents(
                    EmberLib.MatrixType.onetoN, 
                    EmberLib.MatrixMode.linear
                );
                matrixNode.contents.identifier = "matrix";
                matrixNode.contents.description = "matrix";
                matrixNode.contents.targetCount = TARGETCOUNT;
                matrixNode.contents.sourceCount = SOURCECOUNT;
            });
            it("should update connections", () => {
                matrixNode.connections = {
                    0: new EmberLib.MatrixConnection(0)
                };

                const newMatrixNode = new EmberLib.MatrixNode(0);
                newMatrixNode.contents = new EmberLib.MatrixContents(
                    EmberLib.MatrixType.onetoN, 
                    EmberLib.MatrixMode.nonLinear
                );                
                newMatrixNode.contents.identifier = "matrix";
                newMatrixNode.contents.description = "matrix";
                matrixNode.connections[0].sources = [1];
                newMatrixNode.connections = {
                    0: matrixNode.connections[0],
                    1: new EmberLib.MatrixConnection(1)
                };
                EmberLib.Matrix.MatrixUpdate(matrixNode, newMatrixNode);
                expect(matrixNode.connections[1]).toBeDefined();
                matrixNode.connections = null;
                EmberLib.Matrix.MatrixUpdate(matrixNode, newMatrixNode);
                expect(matrixNode.connections[1]).toBeDefined();
            });
            it("should ignore empty connections request", () => {
                matrixNode.connections = {
                    0: new EmberLib.MatrixConnection(0)
                };

                const newMatrixNode = new EmberLib.MatrixNode(0);
                newMatrixNode.contents = new EmberLib.MatrixContents(
                    EmberLib.MatrixType.onetoN, 
                    EmberLib.MatrixMode.nonLinear
                );                
                newMatrixNode.contents.identifier = "matrix";
                newMatrixNode.contents.description = "matrix";
                newMatrixNode.connections = null;
                EmberLib.Matrix.MatrixUpdate(matrixNode, newMatrixNode);
                expect(matrixNode.connections[0]).toBeDefined();                
            });
            it("should throw error if invalid target inside new connections", () => {
                matrixNode.connections = {
                    0: new EmberLib.MatrixConnection(0)
                };

                const newMatrixNode = new EmberLib.MatrixNode(0);
                newMatrixNode.contents = new EmberLib.MatrixContents(
                    EmberLib.MatrixType.onetoN, 
                    EmberLib.MatrixMode.nonLinear
                );                
                newMatrixNode.contents.identifier = "matrix";
                newMatrixNode.contents.description = "matrix";
                newMatrixNode.connections = {
                    7: new EmberLib.MatrixConnection(7)
                };
                try {
                    EmberLib.Matrix.MatrixUpdate(matrixNode, newMatrixNode);
                    throw new Error("Should not succeed");
                }
                catch(e) {
                    expect(e instanceof Errors.InvalidMatrixSignal).toBeTruthy();
                }
            });
            it("should not throw an error on valid non-linear connect", () => {
                let error = null;
                const newMatrixNode = new EmberLib.MatrixNode(0);
                newMatrixNode.contents = new EmberLib.MatrixContents(
                    EmberLib.MatrixType.onetoN, 
                    EmberLib.MatrixMode.nonLinear
                );
                newMatrixNode.targets = [0, 3];
                newMatrixNode.sources = [0, 3];
                newMatrixNode.contents.identifier = "matrix";
                newMatrixNode.contents.description = "matrix";


                matrixNode.contents.mode = EmberLib.MatrixMode.nonLinear;
                matrixNode.connections = null;
                try {
                    EmberLib.Matrix.MatrixUpdate(matrixNode, newMatrixNode);                    
                }
                catch(e) {   
                    error = e;
                }
                expect(error == null).toBeTruthy();
                expect(matrixNode.targets).toBeDefined();
                expect(matrixNode.targets.length).toBe(newMatrixNode.targets.length);
                expect(matrixNode.sources.length).toBe(newMatrixNode.sources.length);
            });
        });
        describe("disconnectSources", () => {
            let matrixNode;
            const TARGETCOUNT = 5;
            const SOURCECOUNT = 5;
            beforeEach(() => {
                matrixNode = new EmberLib.MatrixNode(0);
                matrixNode.contents = new EmberLib.MatrixContents(
                    EmberLib.MatrixType.onetoN, 
                    EmberLib.MatrixMode.linear
                );
                matrixNode.contents.identifier = "matrix";
                matrixNode.contents.description = "matrix";
                matrixNode.contents.targetCount = TARGETCOUNT;
                matrixNode.contents.sourceCount = SOURCECOUNT;
            });
            it("should generate the connection structure if not existent", () => {
                EmberLib.Matrix.disconnectSources(matrixNode, 0, [1]);
            });
            it("should disconnect existing connection", () => {
                matrixNode.connections = {
                    0: new EmberLib.MatrixConnection(0)
                };
                EmberLib.Matrix.connectSources(matrixNode, 0, [1]);
                EmberLib.Matrix.connectSources(matrixNode, 1, [1]);
                expect(matrixNode._numConnections).toBe(2);
                EmberLib.Matrix.disconnectSources(matrixNode, 0, [1]);
                expect(matrixNode.connections[0]).toBeDefined();
                expect(matrixNode.connections[0].sources.length).toBe(0);
                expect(matrixNode._numConnections).toBe(1);
            });
            it("should ignore disconnect with no source", () => {
                matrixNode.connections = {
                    0: new EmberLib.MatrixConnection(0)
                };
                EmberLib.Matrix.connectSources(matrixNode, 0, [1]);
                expect(matrixNode._numConnections).toBe(1);
                EmberLib.Matrix.disconnectSources(matrixNode, 0, null);
                expect(matrixNode.connections[0]).toBeDefined();
                expect(matrixNode.connections[0].sources.length).toBe(1);
            });
            it("should ignore disconnect with not connected source", () => {
                matrixNode.connections = {
                    0: new EmberLib.MatrixConnection(0)
                };
                EmberLib.Matrix.connectSources(matrixNode, 0, [1]);
                EmberLib.Matrix.connectSources(matrixNode, 1, [0]);
                expect(matrixNode._numConnections).toBe(2);
                EmberLib.Matrix.disconnectSources(matrixNode, 0, [0]);
                expect(matrixNode.connections[0]).toBeDefined();
                expect(matrixNode.connections[0].sources.length).toBe(1);
                expect(matrixNode._numConnections).toBe(2);
            });
        });
        describe("decodeConnections", () => {
            let matrixNode;
            const TARGETCOUNT = 5;
            const SOURCECOUNT = 5;
            beforeEach(() => {
                matrixNode = new EmberLib.MatrixNode(0);
                matrixNode.contents = new EmberLib.MatrixContents(
                    EmberLib.MatrixType.onetoN, 
                    EmberLib.MatrixMode.linear
                );
                matrixNode.contents.identifier = "matrix";
                matrixNode.contents.description = "matrix";
                matrixNode.contents.targetCount = TARGETCOUNT;
                matrixNode.contents.sourceCount = SOURCECOUNT;
            });
            it("should generate the connection structure if not existent", () => {
                const SOURCEID = 0;
                EmberLib.Matrix.connectSources(matrixNode, 0, [SOURCEID]);
                const writer = new BER.Writer();
                matrixNode.encodeConnections(writer);
                const ber = new BER.Reader(writer.buffer);
                const seq = ber.getSequence(BER.CONTEXT(5));
                const connections = EmberLib.Matrix.decodeConnections(seq);
                expect(connections[0].sources).toBeDefined();
                expect(connections[0].sources.length).toBe(1);
                expect(connections[0].sources[0]).toBe(SOURCEID);
            });
        });
        describe("encodeConnections", () => {
            it ("should ignore empty/null connections", () => {
                const matrixNode = new EmberLib.MatrixNode(0);
                matrixNode.connections = null;
                const writer = new BER.Writer();
                matrixNode.encodeConnections(writer);
                expect(writer.buffer.length).toBe(0);
            });
        });
        describe("canConnect", () => {
            let matrixNode;
            const TARGETCOUNT = 5;
            const SOURCECOUNT = 5;
            beforeEach(() => {
                matrixNode = new EmberLib.MatrixNode(0);
                matrixNode.contents = new EmberLib.MatrixContents(
                    EmberLib.MatrixType.onetoN, 
                    EmberLib.MatrixMode.linear
                );
                matrixNode.contents.identifier = "matrix";
                matrixNode.contents.description = "matrix";
                matrixNode.contents.targetCount = TARGETCOUNT;
                matrixNode.contents.sourceCount = SOURCECOUNT;
            });
            it("should consider default type as 1toN", () => {
                matrixNode.connections = null;
                matrixNode.contents.type = null;
                matrixNode.contents.maximumTotalConnects = 1;
                const res = EmberLib.Matrix.canConnect(matrixNode, 0, [0,3]);
                expect(res).toBeFalsy();
            });
            it("should return false if more than 1 source in 1toN", () => {
                matrixNode.connections = null;
                matrixNode.contents.maximumTotalConnects = 1;
                const res = EmberLib.Matrix.canConnect(matrixNode, 0, [0,3]);
                expect(res).toBeFalsy();
            });
            it("should always return true if NtoN and no limits", () => {
                matrixNode.contents = new EmberLib.MatrixContents(
                    EmberLib.MatrixType.nToN, 
                    EmberLib.MatrixMode.linear
                );
                matrixNode.connections = null;
                matrixNode.contents.maximumConnectsPerTarget = null;
                matrixNode.contents.maximumTotalConnects = null;
                const res = EmberLib.Matrix.canConnect(matrixNode, 0, [0,3]);
                expect(res).toBeTruthy();
            });
            it("should check maximumTotalConnects in NtoN and reject on limit pass", () => {
                matrixNode.contents = new EmberLib.MatrixContents(
                    EmberLib.MatrixType.nToN, 
                    EmberLib.MatrixMode.linear
                );
                matrixNode.contents.maximumConnectsPerTarget = null;
                matrixNode.contents.maximumTotalConnects = 2;
                EmberLib.Matrix.connectSources(matrixNode, 0, [1,2]);
                const res = EmberLib.Matrix.canConnect(matrixNode, 1, [3]);
                expect(res).toBeFalsy();
            });
            it("should check maximumTotalConnects in NtoN and accept if below limit", () => {
                matrixNode.contents = new EmberLib.MatrixContents(
                    EmberLib.MatrixType.nToN, 
                    EmberLib.MatrixMode.linear
                );
                matrixNode.connections = null;
                matrixNode.contents.maximumConnectsPerTarget = null;
                matrixNode.contents.maximumTotalConnects = 2;
                const res = EmberLib.Matrix.canConnect(matrixNode, 1, [3]);
                expect(res).toBeTruthy();
            });
            it("should check locked connection", () => {
                matrixNode.contents = new EmberLib.MatrixContents(
                    EmberLib.MatrixType.nToN, 
                    EmberLib.MatrixMode.linear
                );
                matrixNode.connections = null;
                matrixNode.contents.maximumConnectsPerTarget = null;
                matrixNode.contents.maximumTotalConnects = 2;
                EmberLib.Matrix.connectSources(matrixNode, 0, [1]);
                matrixNode.connections[0].lock();
                let res = EmberLib.Matrix.canConnect(matrixNode, 0, [3]);
                expect(res).toBeFalsy();
                matrixNode.connections[0].unlock();
                res = EmberLib.Matrix.canConnect(matrixNode, 0, [3]);
                expect(res).toBeTruthy();
            });
        });
        describe("Matrix Non-Linear", () => {
            it("should have encoder / decoder", () => {
                const PATH = "0.1.2";
                const matrixNode = new EmberLib.MatrixNode(0);
                const qMatrixNode = new EmberLib.QualifiedMatrix(PATH);
                matrixNode.contents = new EmberLib.MatrixContents(
                    EmberLib.MatrixType.onetoN, 
                    EmberLib.MatrixMode.nonLinear
                );
                matrixNode.contents.gainParameterNumber = 4;
                matrixNode.contents.identifier = "matrix";
                matrixNode.contents.description = "matrix";
                matrixNode.contents.maximumTotalConnects = 5;
                matrixNode.contents.maximumConnectsPerTarget = 1;
                matrixNode.contents.parametersLocation = "1.2.3";
                matrixNode.contents.schemaIdentifiers = "de.l-s-b.emberplus.schema1";
                matrixNode.contents.templateReference = "0.1.2.3";
                qMatrixNode.contents = matrixNode.contents;
                matrixNode.targets = [0,3];
                qMatrixNode.targets = matrixNode.targets;
                matrixNode.sources = [1,2];
                qMatrixNode.sources = matrixNode.sources;
                let writer = new BER.Writer();
                matrixNode.encode(writer);
                let newMatrixNode = EmberLib.Matrix.decode(new BER.Reader(writer.buffer));
                expect(newMatrixNode.targets).toBeDefined();

                writer = new BER.Writer();
                qMatrixNode.encode(writer);
                newMatrixNode = EmberLib.QualifiedMatrix.decode(new BER.Reader(writer.buffer));
                expect(newMatrixNode.targets).toBeDefined();


                // Should support int 
                matrixNode.contents.parametersLocation = 123;
                writer = new BER.Writer();
                matrixNode.encode(writer);
                newMatrixNode = EmberLib.Matrix.decode(new BER.Reader(writer.buffer));
                expect(newMatrixNode.targets).toBeDefined();
                expect(newMatrixNode.contents.parametersLocation).toBe(matrixNode.contents.parametersLocation);
            });
            it("should have connect function", () => {
                const root = new EmberLib.Root();
                const matrixNode = new EmberLib.MatrixNode(0);
                matrixNode.contents = new EmberLib.MatrixContents(
                    EmberLib.MatrixType.onetoN, 
                    EmberLib.MatrixMode.nonLinear
                );
                matrixNode.contents.identifier = "matrix";
                matrixNode.contents.description = "matrix";
                matrixNode.targets = [0,3];
                matrixNode.sources = [1,2];
                root.addChild(matrixNode);
                const connect = matrixNode.connect({0: new EmberLib.MatrixConnection(0)});
                expect(connect).toBeDefined();
            });
            it("should throw an error if can't decode", () => {
                const writer = new BER.Writer();
                writer.startSequence(BER.APPLICATION(13));    
                writer.startSequence(BER.CONTEXT(0));
                writer.writeInt(1);
                writer.endSequence(); // BER.CONTEXT(0)
                writer.startSequence(BER.CONTEXT(99));
                writer.endSequence();
                writer.endSequence();
                try {
                    EmberLib.MatrixNode.decode(new BER.Reader(writer.buffer));
                    throw new Error("Should not succeed");
                }
                catch(e) {
                    expect(e instanceof Errors.UnimplementedEmberTypeError).toBeTruthy();
                }
            });
        });
        describe("Label", () => {
            it ("should throw an error if it fails to decode", () => {
                const writer = new BER.Writer();
                writer.startSequence(BER.APPLICATION(18));
                writer.startSequence(BER.CONTEXT(99));
                writer.endSequence();
                writer.endSequence();
                try {
                    EmberLib.Label.decode(new BER.Reader(writer.buffer));
                    throw new Error("Should not succeed");
                }
                catch(e) {
                    expect(e instanceof Errors.UnimplementedEmberTypeError).toBeTruthy();
                }
            });
            it ("should throw an error if no basePath", () => {
                const label = new EmberLib.Label(null, "test");
                const writer = new BER.Writer();
                try {
                    label.encode(writer);
                    throw new Error("Should not succeed");
                }
                catch(e) {
                    expect(e instanceof Errors.InvalidEmberNode).toBeTruthy();
                }
            });
            it ("should throw an error if no description", () => {
                const label = new EmberLib.Label("1.2.3", null);
                const writer = new BER.Writer();
                try {
                    label.encode(writer);
                    throw new Error("Should not succeed");
                }
                catch(e) {
                    expect(e instanceof Errors.InvalidEmberNode).toBeTruthy();
                }
            });
            it ("should be able to encode/decode a valid label", () => {
                const label = new EmberLib.Label("1.2.3", "primary");
                const writer = new BER.Writer();
                label.encode(writer);
                const reader = new BER.Reader(writer.buffer);
                const newLabel = EmberLib.Label.decode(reader);
                expect(newLabel.description).toBe(label.description);
                expect(newLabel.basePath).toBe(label.basePath);
            });
        })
    });
    describe("Invocation", () => {
        it("Should throw an error if unable to decode", () => {
            const writer = new BER.Writer();
            writer.startSequence(EmberLib.Invocation.BERID);
            writer.startSequence(BER.CONTEXT(99));
            writer.endSequence();
            writer.endSequence();
            try {
                EmberLib.Invocation.decode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(e) {
                expect(e instanceof Errors.UnimplementedEmberTypeError).toBeTruthy();
            }
        });
        it("Should be able to encode even if no id", () => {
            const invocation = new EmberLib.Invocation();
            const writer = new BER.Writer();
            invocation.encode(writer);
            const i = EmberLib.Invocation.decode(new BER.Reader(writer.buffer));
            expect(i.id == null).toBeTruthy();
        });
        it("Should have a toJSON", () => {
            const invocation = new EmberLib.Invocation(1, [
                new EmberLib.FunctionArgument(EmberLib.ParameterType.integer, 10, "arg1" )
            ]);
            let js = invocation.toJSON();
            expect(js.id).toBe(invocation.id);
            expect(js.arguments.length).toBe(invocation.arguments.length);
            invocation.arguments = null;
            js = invocation.toJSON();
            expect(js.id).toBe(invocation.id);
            expect(js.arguments).toBe(null);
        });
    });
    describe("InvocationResult", () => {
        it("should support all types of result", () => {
            const invocationResult = new EmberLib.InvocationResult();
            invocationResult.invocationId = 100;
            const valBuf = [0xa, 0x1, 0x2];
            invocationResult.setFailure();
            expect(invocationResult.success).toBeFalsy();
            invocationResult.setSuccess();
            expect(invocationResult.success).toBeTruthy();
            try {
                invocationResult.setResult(new EmberLib.FunctionArgument(EmberLib.ParameterType.integer, 1));
                throw new Error("should not succeed");
            }
            catch(e) {
                expect(e instanceof Errors.InvalidResultFormat).toBeTruthy();
            }
            expect(invocationResult.toQualified()).toBe(invocationResult);
            invocationResult.setResult([
                new EmberLib.FunctionArgument(EmberLib.ParameterType.integer, 1),
                new EmberLib.FunctionArgument(EmberLib.ParameterType.real, 1.1),
                new EmberLib.FunctionArgument(EmberLib.ParameterType.string, "one"),
                new EmberLib.FunctionArgument(EmberLib.ParameterType.boolean, false),
                new EmberLib.FunctionArgument(EmberLib.ParameterType.octets, Buffer.from(valBuf))
            ]);
            const writer = new BER.Writer();
            invocationResult.encode(writer);
            const newInvocationRes = EmberLib.InvocationResult.decode(new BER.Reader(writer.buffer));
            expect(newInvocationRes.success).toBe(invocationResult.success);
            expect(newInvocationRes.invocationId).toBe(invocationResult.invocationId);
            expect(newInvocationRes.result.length).toBe(invocationResult.result.length);
            expect(newInvocationRes.result[4].value.length).toBe(valBuf.length);
            expect(newInvocationRes.result[4].value[0]).toBe(valBuf[0]);
        });
        it("should be able to encode with not result, no success", () => {
            const invocationResult = new EmberLib.InvocationResult();
            invocationResult.invocationId = 100;
            invocationResult.result = null;
            invocationResult.sucess = null;
            const writer = new BER.Writer();
            invocationResult.encode(writer);
            const newInvocationRes = EmberLib.InvocationResult.decode(new BER.Reader(writer.buffer));
            expect(newInvocationRes.result).not.toBeDefined();
        });
        it("should be able to encode with no invocationId", () => {
            const invocationResult = new EmberLib.InvocationResult();
            invocationResult.invocationId = null;
            invocationResult.result = null;
            invocationResult.sucess = null;
            const writer = new BER.Writer();
            invocationResult.encode(writer);
            const newInvocationRes = EmberLib.InvocationResult.decode(new BER.Reader(writer.buffer));
            expect(newInvocationRes.invocationId == null).toBeTruthy();
        });
        it("should throw an error if can't decode", () => {
            let writer = new BER.Writer();
            writer.startSequence(EmberLib.InvocationResult.BERID);
            writer.startSequence(BER.CONTEXT(3));
            writer.endSequence();
            writer.endSequence();
            try {
                EmberLib.InvocationResult.decode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(e) {
                expect(e instanceof Errors.UnimplementedEmberTypeError).toBeTruthy();
            }
            writer = new BER.Writer();
            writer.startSequence(EmberLib.InvocationResult.BERID);
            writer.startSequence(BER.CONTEXT(2));
            writer.startSequence(BER.EMBER_SEQUENCE);
            writer.startSequence(BER.CONTEXT(99));
            writer.endSequence();
            writer.endSequence();
            writer.endSequence();
            writer.endSequence();
            try {
                EmberLib.InvocationResult.decode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(e) {
                expect(e instanceof Errors.UnimplementedEmberTypeError).toBeTruthy();
            }
        });
    });
    describe("MatrixConnection", () => {
        it("should have a decoder and throw error if can't decode", () => {
            let writer = new BER.Writer();
            writer.startSequence(EmberLib.MatrixConnection.BERID);
            writer.startSequence(BER.CONTEXT(99));
            writer.endSequence();
            writer.endSequence();
            try {
                EmberLib.MatrixConnection.decode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(e) {
                expect(e instanceof Errors.UnimplementedEmberTypeError).toBeTruthy();
            }
        });
        it("should decode connection with no source", () => {
            const matrixConnection = new EmberLib.MatrixConnection(0);
            matrixConnection.sources = [];
            const writer = new BER.Writer();
            matrixConnection.encode(writer);
            const newMC = EmberLib.MatrixConnection.decode(new BER.Reader(writer.buffer));
            expect(newMC.sources).toBeDefined();
            expect(newMC.sources.length).toBe(0);
        });
        it("should throw an error if invalid target", () => {
            try {
                new EmberLib.MatrixConnection("zero");
                throw new Error("Should not succeed");
            }
            catch(e) {
                expect(e instanceof Errors.InvalidMatrixSignal).toBeTruthy();
            }            
        });
    });
    describe("QualifiedFunction", () => {
        it("Should throw an error if unable to decode", () => {
            const writer = new BER.Writer();
            writer.startSequence(EmberLib.QualifiedFunction.BERID);
            writer.startSequence(BER.CONTEXT(99));
            writer.endSequence();
            writer.endSequence();
            try {
                EmberLib.QualifiedFunction.decode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(e) {                
                expect(e instanceof Errors.UnimplementedEmberTypeError).toBeTruthy();
            }
        });
    });
    describe("QualifiedMatrix", () => {
        const PATH = "1.2.3";
        it("Should throw an error if unable to decode", () => {
            const writer = new BER.Writer();
            writer.startSequence(EmberLib.QualifiedMatrix.BERID);
            writer.startSequence(BER.CONTEXT(99));
            writer.endSequence();
            writer.endSequence();
            try {
                EmberLib.QualifiedMatrix.decode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(e) {                
                expect(e instanceof Errors.UnimplementedEmberTypeError).toBeTruthy();
            }
        });
        it("Should have a subscribe/unsubscribe function", () => {
            const qMatrixNode = new EmberLib.QualifiedMatrix(PATH);
            qMatrixNode.contents = new EmberLib.MatrixContents();
            const cb = function() {};
            let cmd = qMatrixNode.subscribe(cb);
            expect(cmd).toBeDefined();
            expect(cmd instanceof EmberLib.Root).toBeTruthy();
        });
    });
    describe("QualifiedNode", () => {
        const PATH = "0.1.2";
        it("Should throw an error if unable to decode", () => {
            const writer = new BER.Writer();
            writer.startSequence(EmberLib.QualifiedNode.BERID);
            writer.startSequence(BER.CONTEXT(99));
            writer.endSequence();
            writer.endSequence();
            try {
                EmberLib.QualifiedNode.decode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(e) {                
                expect(e instanceof Errors.UnimplementedEmberTypeError).toBeTruthy();
            }
        });
        it("Should return true to isNode() call", () => {
            const qNode = new EmberLib.QualifiedNode(PATH);
            expect(qNode.isNode()).toBeTruthy();
        });
    });
    describe("QualifiedParameter", () => {
        const PATH = "0.1.2";
        it("Should throw an error if unable to decode", () => {
            const writer = new BER.Writer();
            writer.startSequence(EmberLib.QualifiedParameter.BERID);
            writer.startSequence(BER.CONTEXT(99));
            writer.endSequence();
            writer.endSequence();
            try {
                EmberLib.QualifiedParameter.decode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(e) {                
                expect(e instanceof Errors.UnimplementedEmberTypeError).toBeTruthy();
            }
        });
        it("should update and ignore key starting with _", () => {
            const NEW_VAL = 15;
            const qp = new EmberLib.QualifiedParameter(PATH);
            qp.contents = new EmberLib.ParameterContents(5, "integer");
            const dup = new EmberLib.QualifiedParameter(PATH);
            dup.contents = new EmberLib.ParameterContents(NEW_VAL, "integer");
            dup.contents["_ignore"] = "test";
            qp.update(dup);
            expect(qp.contents._ignore).not.toBeDefined();
            expect(qp.contents.value).toBe(NEW_VAL);
        });
        it("Should return true to isParameter() call", () => {
            const qNode = new EmberLib.QualifiedParameter(PATH);
            expect(qNode.isParameter()).toBeTruthy();
        });
        it("should have setValue function", () => {
            const qp = new EmberLib.QualifiedParameter(PATH);
            const VALUE = 1;
            qp.contents = new EmberLib.ParameterContents(VALUE, "integer");
            let NEW_VALUE = VALUE + 1;
            let setVal = qp.setValue(NEW_VALUE);
            let dup = setVal.getElementByPath(PATH);
            expect(dup).toBeDefined();
            expect(dup.contents.value).toBe(NEW_VALUE);
            NEW_VALUE = NEW_VALUE + 1;
            setVal = qp.setValue(new EmberLib.ParameterContents(NEW_VALUE));
            expect(setVal.getElementByPath(PATH).contents.value).toBe(NEW_VALUE);
        });
        it("should accept subscribers and have a function to update them", () => {
            const qp = new EmberLib.QualifiedParameter(PATH);
            const VALUE = 1;
            qp.contents = new EmberLib.ParameterContents(VALUE, "integer");
            qp.contents.streamIdentifier = 12345;
            let updatedValue = null;
            const handleUpdate = function(param) {
                updatedValue = param.contents.value;
            }
            qp.subscribe(handleUpdate);
            qp.updateSubscribers();
            expect(updatedValue).toBe(VALUE);
        });
    });
    describe("StreamDescription", () => {
        it("Should throw an error if unable to decode", () => {
            const writer = new BER.Writer();
            writer.startSequence(EmberLib.StreamDescription.BERID);
            writer.startSequence(BER.CONTEXT(99));
            writer.endSequence();
            writer.endSequence();
            try {
                EmberLib.StreamDescription.decode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(e) {                
                expect(e instanceof Errors.UnimplementedEmberTypeError).toBeTruthy();
            }
        });
        it("Should have a toJSON", () => {
            const streamDescriptor = new EmberLib.StreamDescription();
            streamDescriptor.format = EmberLib.StreamFormat.signedInt8;            
            const OFFSET = 4;
            streamDescriptor.offset = OFFSET;

            let js = streamDescriptor.toJSON();
            expect(js).toBeDefined();
            expect(js.format).toBeDefined();
            expect(js.offset).toBe(OFFSET);

            streamDescriptor.format = null;
            js = streamDescriptor.toJSON();
            expect(js).toBeDefined();
            expect(js.format).toBe(null);
            expect(js.offset).toBe(OFFSET);
        });
    });
    describe("StringIntegerCollection", () => {
        it("should reject invalid value", () => {
            const sic = new EmberLib.StringIntegerCollection();
            try {
                sic.addEntry("test", 4);
            }
            catch(e) {
                expect(e instanceof Errors.InvalidStringPair).toBeTruthy();
            }
        });
        it("should have a toJSON", () => {
            const KEY = "test";
            const VAL = 4;
            const sic = new EmberLib.StringIntegerCollection();
            sic.addEntry("test", new EmberLib.StringIntegerPair(KEY, VAL));
            const js = sic.toJSON();
            expect(js).toBeDefined();
            expect(js.length).toBe(1);
        });
    });
    describe("StringIntegerPair", () => {
        it("should throw an error if trying to encode invalid key/value", () => {
            const sp = new EmberLib.StringIntegerPair();
            const writer = new BER.Writer();
            try {
                sp.encode(writer);
                throw new Error("Should not succeed");
            }
            catch(e) {
                expect(e instanceof Errors.InvalidEmberNode).toBeTruthy();
            }
        });
    });
    describe("rootDecode", () => {
        it("Should throw an error if unable to decode", () => {
            const writer = new BER.Writer();
            writer.startSequence(BER.CONTEXT(99));
            writer.endSequence();
            try {
                EmberLib.rootDecode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(e) {                
                expect(e instanceof Errors.UnimplementedEmberTypeError).toBeTruthy();
            }
        });
    });
    describe("QualifiedTemplate", () => {
        const PATH = "0.1.2";
        it("Should throw an error if unable to decode", () => {
            const writer = new BER.Writer();
            writer.startSequence(EmberLib.QualifiedTemplate.BERID);
            writer.startSequence(BER.CONTEXT(99));
            writer.endSequence();
            writer.endSequence();
            try {
                EmberLib.QualifiedTemplate.decode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(e) {                
                expect(e instanceof Errors.UnimplementedEmberTypeError).toBeTruthy();
            }
        });
        it("should have encoder/decoder", () => {
            const qp = new EmberLib.QualifiedTemplate(PATH, new EmberLib.Node(0));
            let writer = new BER.Writer();
            qp.encode(writer);
            let dup = EmberLib.QualifiedTemplate.decode(new BER.Reader(writer.buffer));
            expect(dup).toBeDefined();
            expect(dup.getPath()).toBe(PATH);
            expect(dup.element instanceof EmberLib.Node).toBeTruthy();

            const DESCRIPTION = "description";
            qp.description = DESCRIPTION;
            writer = new BER.Writer();
            qp.encode(writer);
            dup = EmberLib.QualifiedTemplate.decode(new BER.Reader(writer.buffer));
            expect(dup).toBeDefined();
            expect(dup.getPath()).toBe(PATH);
            expect(dup.element instanceof EmberLib.Node).toBeTruthy();
            expect(dup.description).toBe(DESCRIPTION);
        });

        it("Should return true to isTemplate() call", () => {
            const qp = new EmberLib.QualifiedTemplate(PATH, new EmberLib.Node(0));
            expect(qp.isTemplate()).toBeTruthy();
        });
    });
    describe("Template", () => {
        it("Should throw an error if unable to decode", () => {
            const writer = new BER.Writer();
            writer.startSequence(EmberLib.Template.BERID);
            writer.startSequence(BER.CONTEXT(99));
            writer.endSequence();
            writer.endSequence();
            try {
                EmberLib.Template.decode(new BER.Reader(writer.buffer));
                throw new Error("Should not succeed");
            }
            catch(e) {                
                expect(e instanceof Errors.UnimplementedEmberTypeError).toBeTruthy();
            }
        });
        it("should have encoder/decoder", () => {
            const qp = new EmberLib.Template(10, new EmberLib.Node(0));
            let writer = new BER.Writer();
            qp.encode(writer);
            let dup = EmberLib.Template.decode(new BER.Reader(writer.buffer));
            expect(dup).toBeDefined();
            expect(dup.getNumber()).toBe(10);

            const DESCRIPTION = "description";
            qp.description = DESCRIPTION;
            writer = new BER.Writer();
            qp.encode(writer);
            dup = EmberLib.Template.decode(new BER.Reader(writer.buffer));
            expect(dup).toBeDefined();
            expect(dup.element instanceof EmberLib.Node).toBeTruthy();
            expect(dup.description).toBe(DESCRIPTION);

            writer = new BER.Writer();
            qp.element = new EmberLib.Function(0, null);
            qp.encode(writer);
            dup = EmberLib.Template.decode(new BER.Reader(writer.buffer));
            expect(dup.element instanceof EmberLib.Function).toBeTruthy();

            writer = new BER.Writer();
            qp.element = new EmberLib.Parameter(0);
            qp.encode(writer);
            dup = EmberLib.Template.decode(new BER.Reader(writer.buffer));
            expect(dup.element instanceof EmberLib.Parameter).toBeTruthy();

            writer = new BER.Writer();
            qp.element = new EmberLib.MatrixNode(0);
            qp.encode(writer);
            dup = EmberLib.Template.decode(new BER.Reader(writer.buffer));
            expect(dup.element instanceof EmberLib.MatrixNode).toBeTruthy();

        });

        it("Should return true to isTemplate() call", () => {
            const qp = new EmberLib.Template(10, new EmberLib.Node(0));
            expect(qp.isTemplate()).toBeTruthy();
        });

        it("Should have toQualified function", () => {
            const template = new EmberLib.Template(10, new EmberLib.Node(0));
            const qp = template.toQualified();
            expect(qp.isTemplate()).toBeTruthy();
        });

        it("Should have update function", () => {
            const template = new EmberLib.Template(10, new EmberLib.Node(0));
            const DUP_NUM = 5;
            const dup = new EmberLib.Template(10, new EmberLib.Node(DUP_NUM));
            template.update(dup);
            expect(template.element.getNumber()).toBe(DUP_NUM);
        });
    });
});
