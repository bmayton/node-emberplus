"use strict";
const ember = require('../EmberLib');
const Errors = require("../Errors");

class JSONParser {
    /**
     * 
     * @param {MatrixContent} matrixContent 
     * @param {object} content 
     */
    static parseMatrixContent(matrixContent, content) {
        if (content.labels) {
            matrixContent.labels = [];
            for(let l = 0; l < content.labels.length; l++) {
                if (typeof (content.labels[l]) === "object") {
                    matrixContent.labels.push(
                        new ember.Label(
                            content.labels[l].basePath,
                            content.labels[l].description
                        )
                    );
                }
                else {
                    // for backward compatibility... Remove in the future
                    matrixContent.labels.push(
                        new ember.Label(content.labels[l])
                    );
                }
            }
            delete content.labels;
        }
        if (content.type != null) {
            if (content.type == "oneToN") {
                matrixContent.type = ember.MatrixType.oneToN;
            }
            else if (content.type == "oneToOne") {
                matrixContent.type = ember.MatrixType.oneToOne;
            }
            else if (content.type == "nToN") {
                matrixContent.type = ember.MatrixType.nToN;  
                matrixContent.maximumTotalConnects = content.maximumTotalConnects == null ? 
                    Number(content.targetCount) * Number(content.sourceCount) : Number(content.maximumTotalConnects);                
                matrixContent.maximumConnectsPerTarget = content.maximumConnectsPerTarget == null ?
                    Number(content.sourceCount) : Number(content.maximumConnectsPerTarget);
            }
            else {
                throw new Errors.InvalidEmberNode("", `Invalid matrix type ${content.type}`);
            }
            delete content.type;
        }
        if (content.mode != null) {
            if (content.mode == "linear") {
                matrixContent.mode = ember.MatrixMode.linear;
            }
            else if (content.mode == "nonLinear") {
                matrixContent.mode = ember.MatrixMode.nonLinear;
            }
            else {
                throw new Errors.InvalidEmberNode("",`Invalid matrix mode ${content.mode}`);
            }
            delete content.mode;
        }
    }
    
    /**
     * 
     * @param {TreeNode} parent 
     * @param {object} obj 
     */
    static parseObj(parent, obj) {
        for(let i = 0; i < obj.length; i++) {
            let emberElement;
            let content = obj[i];
            let number = content.number != null ? content.number : i;
            delete content.number;
            if (content.value != null) {            
                emberElement = new ember.Parameter(number);
                emberElement.contents = new ember.ParameterContents(content.value);
                if (content.type) {
                    emberElement.contents.type = ember.ParameterType.get(content.type);
                    delete content.type;
                }
                else {
                    emberElement.contents.type = ember.ParameterType.string;
                }
                if (content.access) {
                    emberElement.contents.access = ember.ParameterAccess.get(content.access);
                    delete content.access;
                }
                else {
                    emberElement.contents.access = ember.ParameterAccess.read;
                }
                if (content.streamDescriptor != null) {
                    if (content.streamDescriptor.offset == null || content.streamDescriptor.format == null) {
                        throw new Error("Missing offset or format for streamDescriptor");
                    }
                    emberElement.contents.streamDescriptor = new ember.StreamDescription();
                    emberElement.contents.streamDescriptor.offset = content.streamDescriptor.offset;
                    emberElement.contents.streamDescriptor.format = ember.StreamFormat.get(content.streamDescriptor.format);
                    delete content.streamDescriptor;
                }
            }
            else if (content.func != null) {
                emberElement = new ember.Function(number, content.func);
                emberElement.contents = new ember.FunctionContent();
                if (content.arguments != null) {
                    for(let argument of content.arguments) {
                        emberElement.contents.arguments.push(new ember.FunctionArgument(
                            argument.type,
                            argument.value,
                            argument.name
                        ));
                    }
                }
                if (content.result != null) {
                    for(let argument of content.result) {
                        emberElement.contents.result.push(new ember.FunctionArgument(
                            argument.type,
                            argument.value,
                            argument.name
                        ));
                    }
                }
                delete content.result;
            }
            else if (content.targetCount != null) {
                emberElement = new ember.MatrixNode(number);
                emberElement.contents = new ember.MatrixContents();            
                this.parseMatrixContent(emberElement.contents, content);            
                if (content.connections) {
                    emberElement.connections = {};
                    for (let c in content.connections) {
                        if (! content.connections.hasOwnProperty(c)) {
                            continue;
                        }
                        const t = content.connections[c].target != null ? content.connections[c].target : 0;                    
                        emberElement.setSources(t, content.connections[c].sources);
                    }
                    delete content.connections;
                }
                else {
                    emberElement.connections = {};
                    for (let t = 0; t < content.targetCount; t++) {
                        let connection = new ember.MatrixConnection(t);
                        emberElement.connections[t] = connection;
                    }
                }
            }
            else {
                emberElement = new ember.Node(number);
                emberElement.contents = new ember.NodeContents();
            }
            for(let id in content) {
                if (emberElement.isFunction() && id === "arguments") {
                    // we did it already.
                    continue;
                }
                if ((id !== "children") &&  (content.hasOwnProperty(id))) {
                    emberElement.contents[id] = content[id];
                }
                else {
                    this.parseObj(emberElement, content.children);
                }
            }
            parent.addChild(emberElement);
        }
    }        
}

module.exports = JSONParser;