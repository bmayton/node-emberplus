"use strict";
const MatrixConnection = require("./MatrixConnection");
const TreeNode = require("./TreeNode");
const BER = require('../ber.js');
const MatrixMode = require("./MatrixMode");
const MatrixOperation = require("./MatrixOperation");
const MatrixType = require("./MatrixType");
const Errors = require("../Errors");

class Matrix extends TreeNode 
{
    constructor() {
        super();
        this._connectedSources = {};
        this._numConnections = 0;
        this.targets = null;
        this.sources = null;
        this.connections = {};
    }

    isMatrix() {
        return true;
    }

    /**
     * 
     * @param {number} targetID 
     * @param {number[]} sources 
     * @param {Operation} operation 
     * @returns {boolean}
     */
    canConnect(targetID, sources, operation) {
        return Matrix.canConnect(this, targetID, sources, operation);
    }

    /**
     * 
     * @param {Object} connections
     * @returns {root}
     */
    connect(connections) {
        const r = this.getTreeBranch();
        const m = r.getElementByPath(this.getPath());
        m.connections = connections;
        return r;
    }

    /**
     * 
     * @param {number} targetID 
     * @param {number[]} sources 
     */
    connectSources(targetID, sources) {
        return Matrix.connectSources(this, targetID, sources);
    }

    /**
     * 
     * @param {number} targetID 
     * @param {number[]} sources 
     */
    disconnectSources(targetID, sources) {
        return Matrix.disconnectSources(this, targetID, sources);
    }

    /**
     * 
     * @param {BER} ber 
     */
    encodeConnections(ber) {
        if (this.connections != null) {
            ber.startSequence(BER.CONTEXT(5));
            ber.startSequence(BER.EMBER_SEQUENCE);
    
            for(let id in this.connections) {
                if (this.connections.hasOwnProperty(id)) {
                    ber.startSequence(BER.CONTEXT(0));
                    this.connections[id].encode(ber);
                    ber.endSequence();
                }
            }
            ber.endSequence();
            ber.endSequence();
        }
    }

    /**
     * 
     * @param {BER} ber 
     */
    encodeSources(ber) {
        if (this.sources != null) {
            ber.startSequence(BER.CONTEXT(4));
            ber.startSequence(BER.EMBER_SEQUENCE);
    
            for(let i=0; i<this.sources.length; i++) {
                ber.startSequence(BER.CONTEXT(0));
                ber.startSequence(BER.APPLICATION(15));
                ber.startSequence(BER.CONTEXT(0));
                ber.writeInt(this.sources[i]);
                ber.endSequence();
                ber.endSequence();
                ber.endSequence();
            }
    
            ber.endSequence();
            ber.endSequence();
        }
    }

    /**
     * 
     * @param {BER} ber 
     */
    encodeTargets(ber) {
        if (this.targets != null) {
    
            ber.startSequence(BER.CONTEXT(3));
            ber.startSequence(BER.EMBER_SEQUENCE);
    
            for(let i=0; i<this.targets.length; i++) {
                ber.startSequence(BER.CONTEXT(0));
                ber.startSequence(BER.APPLICATION(14));
                ber.startSequence(BER.CONTEXT(0));
                ber.writeInt(this.targets[i]);
                ber.endSequence();
                ber.endSequence();
                ber.endSequence();
            }
    
            ber.endSequence();
            ber.endSequence();
        }
    }

    /**
     * 
     * @param {number} source 
     */
    getSourceConnections(source) {
        return Matrix.getSourceConnections(this, source);
    }

    /**
     * 
     * @param {number} targetID 
     * @param {number[]} sources 
     */
    setSources(targetID, sources) {
        return Matrix.setSources(this, targetID, sources);
    }

    /**
     * 
     * @param {MatrixNode} other 
     */
    update(other) {
        const res = super.update(other);
        return Matrix.MatrixUpdate(this, other) || res;
    }

    /**
     * 
     * @param {number} targetID 
     * @param {number[]} sources 
     */
    validateConnection(targetID, sources) {
        Matrix.validateConnection(this, targetID, sources);
    }
    
    /**
     * 
     * @param {MatrixNode} matrixNode 
     * @param {number} targetID 
     * @param {number[]} sources 
     * @param {Operation} operation
     * @returns {boolean}
     */
    static canConnect(matrixNode, targetID, sources, operation) {
        if (matrixNode.connections == null) {
            matrixNode.connections = {};
        }
        if (matrixNode.connections[targetID] == null) {
            matrixNode.connections[targetID] = new MatrixConnection(targetID);
        }
        const type = matrixNode.contents.type == null ? MatrixType.oneToN : matrixNode.contents.type;
        const connection = matrixNode.connections[targetID];
        const oldSources = connection == null || connection.sources == null ? [] : connection.sources.slice();
        const newSources = operation === MatrixOperation.absolute ? sources : oldSources.concat(sources);
        const sMap = new Set(newSources.map(i => Number(i)));
               
        if (matrixNode.connections[targetID].isLocked()) {
            return false;
        }
        if (type === MatrixType.oneToN &&
            matrixNode.contents.maximumTotalConnects == null &&
            matrixNode.contents.maximumConnectsPerTarget == null) { 
            return sMap.size < 2;
        }
        else if (type === MatrixType.oneToN && sMap.size >= 2) {
            return false;
        }
        else if (type === MatrixType.oneToOne) {
            if (sMap.size > 1) {
                return false;
            }
            const sourceConnections = matrixNode._connectedSources[sources[0]];
            return sourceConnections == null || sourceConnections.size === 0 || sourceConnections.has(targetID);
        }
        else {
            // N to N
            if (matrixNode.contents.maximumConnectsPerTarget != null &&
                newSources.length > matrixNode.contents.maximumConnectsPerTarget) {
                return false;
            }
            if (matrixNode.contents.maximumTotalConnects != null) {
                let count = matrixNode._numConnections - oldSources.length;
                if (newSources) {
                    count += newSources.length;
                }
                return count <= matrixNode.contents.maximumTotalConnects;
            }
            return true;   
        }        
    }

    /**
     * 
     * @param {MatrixNode} matrixNode 
     * @param {number} targetID 
     * @param {number[]} sources 
     */
    static connectSources(matrix, targetID, sources) {
        const target = Number(targetID);
        if (matrix.connections == null) {
            matrix.connections = {};
        }
        if (matrix.connections[target] == null) {
            matrix.connections[target] = new MatrixConnection(target);
        }
        matrix.connections[target].connectSources(sources);
        if (sources != null) {
            for(let source of sources) {
                if (matrix._connectedSources[source] == null) {
                    matrix._connectedSources[source] = new Set();
                }
                if (!matrix._connectedSources[source].has(target)) {
                    matrix._connectedSources[source].add(target);
                    matrix._numConnections++;
                }
            }
        }
    }

    /**
     * 
     * @param {BER} ber 
     * @returns {number[]}
     */
    static decodeTargets(ber) {
        const targets = [];
        ber = ber.getSequence(BER.EMBER_SEQUENCE);
        while(ber.remain > 0) {
            let seq = ber.getSequence(BER.CONTEXT(0));
            seq = seq.getSequence(BER.APPLICATION(14));
            seq = seq.getSequence(BER.CONTEXT(0));
            targets.push(seq.readInt());
        }
        return targets;
    }
    
    /**
     * 
     * @param {BER} ber 
     * @returns {number[]}
     */
    static decodeSources(ber) {
        const sources = [];
        ber = ber.getSequence(BER.EMBER_SEQUENCE);
        while(ber.remain > 0) {
            let seq = ber.getSequence(BER.CONTEXT(0));
            seq = seq.getSequence(BER.APPLICATION(15));
            seq = seq.getSequence(BER.CONTEXT(0));
            sources.push(seq.readInt());
        }
        return sources;
    }
    
    /**
     * 
     * @param {BER} ber 
     * @returns {Object<number, MatrixConnection>}
     */
    static decodeConnections(ber) {
        const connections = {};
        const seq = ber.getSequence(BER.EMBER_SEQUENCE);
        while(seq.remain > 0) {
            const conSeq = seq.getSequence(BER.CONTEXT(0));
            const con = MatrixConnection.decode(conSeq);
            connections[con.target] = (con);
        }
        return connections;
    }

    /**
     * 
     * @param {MatrixNode} matrixNode 
     * @param {number} targetID 
     * @param {number[]} sources 
     */
    static disconnectSources(matrix, targetID, sources) {
        const target = Number(targetID);
        if (matrix.connections[target] == null) {
            matrix.connections[target] = new MatrixConnection(target);
        }
        matrix.connections[target].disconnectSources(sources);
        if (sources != null) {
            for(let source of sources) {
                if (matrix._connectedSources[source] == null) {
                    continue;
                }
                if (matrix._connectedSources[source].has(target)) {
                    matrix._connectedSources[source].delete(target);
                    matrix._numConnections--;
                }
            }
        }
    }

    /**
     * 
     * @param {MatrixNode} matrix 
     * @param {number} source 
     */
    static getSourceConnections(matrix, source) {
        const targets =  matrix._connectedSources[source];
        if (targets) {
            return [...targets];
        }
        return [];
    }

    /**
     * 
     * @param {QualifiedMatrix|MatrixNode} matrix 
     * @param {QualifiedMatrix|MatrixNode} newMatrix 
     * @returns {boolean} - True if something changed
     */
    static MatrixUpdate(matrix, newMatrix) {
        let modified = false;
        if (newMatrix.targets != null) {
            matrix.targets = newMatrix.targets;
            modified = true;
        }
        if (newMatrix.sources != null) {
            matrix.sources = newMatrix.sources;
            modified = true;
        }
        if (newMatrix.connections != null) {
            if (matrix.connections == null) {
                matrix.connections = {};
                modified = true;
            }
            for(let id in newMatrix.connections) {
                if (newMatrix.connections.hasOwnProperty(id)) {
                    const connection = newMatrix.connections[id];
                    if ((connection.target < matrix.contents.targetCount) &&
                        (connection.target >= 0)) {
                        if (matrix.connections[connection.target] == null) {
                            matrix.connections[connection.target] = new MatrixConnection(connection.target);
                            modified = true;
                        }
                        if (matrix.connections[connection.target].isDifferent(connection.sources)) {
                            matrix.connections[connection.target].setSources(connection.sources);
                            modified = true;
                        }
                    }
                    else {
                        throw new Errors.InvalidMatrixSignal(connection.target, "Invalid target")
                    }
                }
            }
        }
        return modified;
    }

    /**
     * 
     * @param {MatrixNode} matrixNode 
     * @param {number} targetID 
     * @param {number[]} sources 
     */
    static setSources(matrix, targetID, sources) {
        const currentSource = matrix.connections[targetID] == null || matrix.connections[targetID].sources == null ? 
        [] : matrix.connections[targetID].sources;
        if (currentSource.length > 0) {
            this.disconnectSources(matrix, targetID, currentSource)
        }
        Matrix.connectSources(matrix, targetID, sources);
    }

    /**
     * 
     * @param {MatrixNode} matrixNode 
     * @param {number} targetID 
     * @param {number[]} sources 
     */
    static validateConnection(matrixNode, targetID, sources) {
        if (targetID < 0) {
            throw new Errors.InvalidMatrixSignal(targetID, "target");
        }
        if (sources == null) {
            throw new Errors.InvalidSourcesFormat();
        }
        for(let i = 0; i < sources.length; i++) {
            if (sources[i] < 0) {
                throw new Errors.InvalidMatrixSignal(sources[i], `Source at index ${i}`);
            }
        }
        if (matrixNode.contents.mode === MatrixMode.linear) {
            if (targetID >= matrixNode.contents.targetCount) {
                throw new Errors.InvalidMatrixSignal(targetID, `Target higher than max value ${matrixNode.contents.targetCount}`);
            }
            for(let i = 0; i < sources.length; i++) {
                if (sources[i] >= matrixNode.contents.sourceCount) {
                    throw new Errors.InvalidMatrixSignal(sources[i],`Source at index ${i} higher than max ${matrixNode.contents.sourceCount}`);
                }
            }
        }
        else if ((matrixNode.targets == null) || (matrixNode.sources == null)) {
            throw new Errors.InvalidEmberNode(matrixNode.getPath(),"Non-Linear matrix should have targets and sources");
        }    
        else {
            let found = false;
            for(let i = 0; i < matrixNode.targets.length; i++) {
                if (matrixNode.targets[i] === targetID) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                throw new Errors.InvalidMatrixSignal(targetID, "Not part of existing targets");
            }
            found = false;
            for(let i = 0; i < sources.length; i++) {
                for(let j = 0; j < matrixNode.sources.length; j++) {
                    if (matrixNode.sources[j] === sources[i]) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    throw new Errors.InvalidMatrixSignal(sources[i],`Unknown source at index ${i}`);
                }
            }
        }    
    }
}

module.exports = Matrix;