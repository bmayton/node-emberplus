const expect = require("expect");
const { S101Client } = require("../EmberSocket");
const s101Buffer = Buffer.from("fe000e0001c001021f026082008d6b820089a0176a15a0050d03010201a10c310aa0080c066c6162656c73a01b6a19a0050d03010202a110310ea00c0c0a706172616d6574657273a051714fa0050d03010203a1463144a0080c066d6174726978a403020104a503020104aa183016a0147212a0050d03010201a1090c075072696d617279a203020102a303020101a8050d03010202a903020101f24cff", "hex");
const errorBuffer = Buffer.from("76fe000e0001c001021f026082008d6b820089a0176a15a0050d03010201a10c310aa0080c066c6162656c73a01b6a19a0050d03010202a110310ea00c0c0a706172616d6574657273a051714fa0050d03010203a1463144a0080c066d6174726978a403020104a503020104aa183016a0147212a0050d03010201a1090c075072696d617279a203020102a303020101a8050d03010202a903020101f24cff", "hex");
const ember = require("../EmberLib");
const BER = require('../ber.js');
const Errors = require('../errors.js');
const EmberLib = require("../EmberLib");

const identifier = "node_identifier";
const description = "node_description";
describe("Ember", () => {
    describe("generic", () => {
        let client;

        beforeAll(() => {
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
            expect(() => ember.Root.decode(ber)).toThrow(Errors.UnimplementedEmberTypeError);
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
            const writer = new BER.Writer();
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
        it("should through an error if unable to decode content", () => {
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
        beforeAll(() => {
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
        it("should through an error if unable to decode result", () => {
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
                expect(e instanceof Errors.UnimplementedEmberTypeError).toBeTruthy();
            }
        });
        it("should through an error if unable to decode content", () => {
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
        it("should through an error if unable to decode FunctionArgument", () => {
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
        it("should have an update function", () => {
            const parameter = new EmberLib.Parameter(0);
            const VALUE = 1;
            let count = 0;
            parameter.contents = new EmberLib.ParameterContents(VALUE, "integer");
            parameter.contents._subscribers.add(() => {count++;});
            const newParameter = new EmberLib.Parameter(0);
            const NEW_VALUE = VALUE + 1;
            newParameter.contents = new EmberLib.ParameterContents(NEW_VALUE, "integer");
            parameter.update(newParameter);
            expect(count).toBe(1);
            expect(parameter.contents.value).toBe(NEW_VALUE);
        });
        it("should have setValue function", () => {
            const parameter = new EmberLib.Parameter(0);
            const VALUE = 1;
            parameter.contents = new EmberLib.ParameterContents(VALUE, "integer");
            const NEW_VALUE = VALUE + 1;
            const setVal = parameter.setValue(NEW_VALUE);
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
            parameter.contents.step = 2;
            parameter.contents.default = 0;
            parameter.contents.type = EmberLib.ParameterType.integer;
            const node = new EmberLib.Node(0);
            parameter.addChild(node);
            const writer = new BER.Writer();
            parameter.encode(writer);
            const newParameter = EmberLib.Parameter.decode(new BER.Reader(writer.buffer));
            expect(newParameter.getChildren().length).toBe(1);
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
        it("should through an error if fails to decode StringIntegerPair", () => {
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
        it("should through an error if fails to decode StringIntegerCollection", () => {
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
    });
    describe("Matrix", () => {
        describe("validateConnection", () => {
            let matrixNode;
            const TARGETCOUNT = 5;
            const SOURCECOUNT = 5;
            beforeAll(() => {
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
            it("should through an error if target is negative", () => {
                try {
                    EmberLib.Matrix.validateConnection(matrixNode, -1, []);
                    throw new Error("Should not succeed");
                }
                catch(e) {
                    expect(e instanceof Errors.InvalidMatrixSignal).toBeTruthy();
                }
            });
            it("should through an error if source is negative", () => {
                try {
                    EmberLib.Matrix.validateConnection(matrixNode, 0, [-1]);
                    throw new Error("Should not succeed");
                }
                catch(e) {
                    expect(e instanceof Errors.InvalidMatrixSignal).toBeTruthy();
                }
            });
            it("should through an error if target higher than max target", () => {
                try {
                    EmberLib.Matrix.validateConnection(matrixNode, TARGETCOUNT, [0]);
                    throw new Error("Should not succeed");
                }
                catch(e) {
                    expect(e instanceof Errors.InvalidMatrixSignal).toBeTruthy();
                }
            });
            it("should through an error if target higher than max target", () => {
                try {
                    EmberLib.Matrix.validateConnection(matrixNode, 0, [SOURCECOUNT]);
                    throw new Error("Should not succeed");
                }
                catch(e) {                    
                    expect(e instanceof Errors.InvalidMatrixSignal).toBeTruthy();
                }
            });
            it("should through an error if non-Linear Matrix without targets", () => {
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
            it("should through an error if non-Linear Matrix without sources", () => {
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
            it("should through an error if non-Linear Matrix and not valid target", () => {
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
            it("should through an error if non-Linear Matrix and not valid source", () => {
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
            it("should not through an error on valid non-linear connect", () => {
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
        });
        describe("MatrixUpdate", () => {
            let matrixNode;
            const TARGETCOUNT = 5;
            const SOURCECOUNT = 5;
            beforeAll(() => {
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
            it("should not through an error on valid non-linear connect", () => {
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
            beforeAll(() => {
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
        });
        describe("decodeConnections", () => {
            let matrixNode;
            const TARGETCOUNT = 5;
            const SOURCECOUNT = 5;
            beforeAll(() => {
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
        describe("canConnect", () => {
            let matrixNode;
            const TARGETCOUNT = 5;
            const SOURCECOUNT = 5;
            beforeAll(() => {
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
        });
        describe("Matrix Non-Linear", () => {
            it("should have encoder / decoder", () => {
                const matrixNode = new EmberLib.MatrixNode(0);
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
                matrixNode.targets = [0,3];
                matrixNode.sources = [1,2];
                const writer = new BER.Writer();
                matrixNode.encode(writer);
                const newMatrixNode = EmberLib.Matrix.decode(new BER.Reader(writer.buffer));
                expect(newMatrixNode.targets).toBeDefined();
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
            it("should through an error if can't decode", () => {
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
        it("should through an error if can't decode", () => {
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
});
