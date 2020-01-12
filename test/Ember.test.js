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
            const jsonCommand = command.toJSON();
            expect(jsonCommand.number).toBe(EmberLib.COMMAND_GETDIRECTORY);
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
        })
        it("should return true when calling isFunction", () => {
            expect(func.isFunction()).toBeTruthy();
        });
        it("should have an invoke function", () => {
            const invoke = func.invoke();
            const children = invoke.getChildren();
            expect(children.length).toBe(1);
            expect(children[0].isCommand()).toBeTruthy();
        });
        it("should have a decoder", () => {
            func.contents = new EmberLib.FunctionContent(identifier, description);
            func.contents.arguments = [ 
                new EmberLib.FunctionArgument(EmberLib.ParameterType.integer,null, "arg1"),
                new EmberLib.FunctionArgument(EmberLib.ParameterType.integer,null, "arg2")
            ];
            func.contents.result = [
                new EmberLib.FunctionArgument(EmberLib.ParameterType.integer,null, "result")
            ];
            const writer = new BER.Writer();
            func.encode(writer);
            const f = EmberLib.Function.decode(new BER.Reader(writer.buffer));
            expect(f.number).toBe(func.number);
            expect(f.contents.identifier).toBe(identifier);
            expect(f.contents.description).toBe(description);
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
        });
        describe("Matrix Non-Linear", () => {
            it("should have encoder / decoder", () => {
                const matrixNode = new EmberLib.MatrixNode(0);
                matrixNode.contents = new EmberLib.MatrixContents(
                    EmberLib.MatrixType.onetoN, 
                    EmberLib.MatrixMode.nonLinear
                );
                matrixNode.contents.identifier = "matrix";
                matrixNode.contents.description = "matrix";
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
        });
    });
});
