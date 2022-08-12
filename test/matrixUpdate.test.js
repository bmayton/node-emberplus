const { Matrix, MatrixContents, MatrixType, MatrixMode, MatrixConnection } = require("../EmberLib");

describe("Matrix Update", () => {
  describe("linear matrix", () => {
    let matrix;
    beforeEach(() => {
      matrix = new Matrix();
      matrix.contents = new MatrixContents(MatrixType.oneToN, MatrixMode.linear);
      matrix.contents.targetCount = 5;
      matrix.contents.sourceCount = 2;
      matrix.connectSources(3, [1]);
    });
    it("update matrix connections", () => {
      const newMatrix = new Matrix();
      newMatrix.contents = new MatrixContents(MatrixType.oneToN, MatrixMode.linear);
      newMatrix.contents.targetCount = 5;
      newMatrix.contents.sourceCount = 2;
      newMatrix.connectSources(3, [0]);
      Matrix.MatrixUpdate(matrix, newMatrix);
      expect(matrix.connections[3].sources).toHaveLength(1);
      expect(matrix.connections[3].sources[0]).toBe(0);
    });
    it("reject invalid connections (source) during matrix update", () => {
      const newMatrix = new Matrix();
      newMatrix.contents = new MatrixContents(MatrixType.oneToN, MatrixMode.linear);
      newMatrix.contents.targetCount = 5;
      newMatrix.contents.sourceCount = 2;
      newMatrix.connectSources(3, [2]);
      expect(() => Matrix.MatrixUpdate(matrix, newMatrix)).toThrow
    });
    it("reject invalid connections (target) during matrix update", () => {
      const newMatrix = new Matrix();
      newMatrix.contents = new MatrixContents(MatrixType.oneToN, MatrixMode.linear);
      newMatrix.contents.targetCount = 5;
      newMatrix.contents.sourceCount = 2;
      newMatrix.connectSources(14, [0]);
      expect(() => Matrix.MatrixUpdate(matrix, newMatrix)).toThrow
    });
  });
  describe("non-linear matrix", () => {
    let matrix;
    beforeEach(() => {
      matrix = new Matrix();
      matrix.contents = new MatrixContents(MatrixType.oneToN, MatrixMode.nonLinear);
      matrix.targets = [1, 3, 5, 6];
      matrix.sources = [0,1,4];
      matrix.connectSources(3, [0]);
    });
    it("update matrix connections", () => {
      const newMatrix = new Matrix();
      newMatrix.contents = new MatrixContents(MatrixType.oneToN, MatrixMode.linear);
      newMatrix.targets = [1, 3, 5, 6];      
      newMatrix.sources = [0,1,4];
      newMatrix.connectSources(3, [4]);
      Matrix.MatrixUpdate(matrix, newMatrix);
      expect(matrix.connections[3].sources).toHaveLength(1);
      expect(matrix.connections[3].sources[0]).toBe(4);
    });
    it("reject invalid connections (source) during matrix update", () => {
      const newMatrix = new Matrix();
      newMatrix.contents = new MatrixContents(MatrixType.oneToN, MatrixMode.linear);
      newMatrix.targets = [1, 3, 5, 6];      
      newMatrix.sources = [0,1,4];
      newMatrix.connectSources(3, [2]);
      expect(() => Matrix.MatrixUpdate(matrix, newMatrix)).toThrow
    });
    it("reject invalid connections (target) during matrix update", () => {
      const newMatrix = new Matrix();
      newMatrix.contents = new MatrixContents(MatrixType.oneToN, MatrixMode.linear);
      newMatrix.targets = [1, 3, 5, 6];      
      newMatrix.sources = [0,1,4];
      newMatrix.connectSources(4, [4]);
      expect(() => Matrix.MatrixUpdate(matrix, newMatrix)).toThrow
    });
  });
})