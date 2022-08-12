const { Matrix, MatrixContents, MatrixNode, MatrixMode, MatrixType, MatrixConnection } = require("../EmberLib");

describe("validateConnection", () => {
  describe("linear matrix", () => {
    let matrixNode;
    beforeEach(() => {
      matrixNode = new MatrixNode(1);
      matrixNode.contents = new MatrixContents(MatrixType.oneToN, MatrixMode.linear);
      matrixNode.contents.targetCount = 3;
      matrixNode.contents.sourceCount = 2;
    });
    it("accept valid connection", () => {
      const connection = new MatrixConnection(2);
      connection.setSources([1]);
      expect(() => Matrix.validateConnection(matrixNode, connection.target, connection.sources)).not.toThrow();
    });
    it("reject invalid source", () => {
      const connection = new MatrixConnection(2);
      connection.setSources([4]);
      expect(() => Matrix.validateConnection(matrixNode, connection.target, connection.sources)).toThrow();
    });
    it("reject invalid target", () => {
      const connection = new MatrixConnection(10);
      connection.setSources([4]);
      expect(() => Matrix.validateConnection(matrixNode, connection.target, connection.sources)).toThrow();
    });
  });
  describe("non-linear matrix", () => {
    let matrixNode;
    beforeEach(() => {
      matrixNode = new MatrixNode(1);
      matrixNode.contents = new MatrixContents(MatrixType.oneToN, MatrixMode.nonLinear);
      matrixNode.targets = [1, 3, 7];
      matrixNode.sources = [1,2,4,8];
    });
    test.each([1,2,4,8])
      ("accept valid connection with source %p", (sourceID) => {
      const connection = new MatrixConnection(3);
      connection.setSources([sourceID]);
      expect(() => Matrix.validateConnection(matrixNode, connection.target, connection.sources)).not.toThrow();
    });
    test.each([-1,3,5,18])("reject invalid source %p", (sourceID) => {
      const connection = new MatrixConnection(1);
      connection.setSources([sourceID]);
      expect(() => Matrix.validateConnection(matrixNode, connection.target, connection.sources)).toThrow();
    });
    it("reject invalid target", () => {
      const connection = new MatrixConnection(10);
      connection.setSources([4]);
      expect(() => Matrix.validateConnection(matrixNode, connection.target, connection.sources)).toThrow();
    });
  });
});