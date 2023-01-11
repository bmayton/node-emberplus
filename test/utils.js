const {ParameterType, FunctionArgument} = require("../EmberLib");


const init = function(_src,_tgt) {
    const targets = _tgt === undefined ? [ "tgt1", "tgt2", "tgt3" ] : _tgt;
    const sources = _src === undefined ? [ "src1", "src2", "src3" ] : _src;
    const defaultSources = [
        {identifier: "t-0", value: -1, access: "readWrite" }, 
        {identifier: "t-1", value: 0, access: "readWrite"}, 
        {identifier: "t-2", value: 0, access: "readWrite"}
     ];
    const labels = function(endpoints, type) {
        let labels = [];
        for (let i = 0; i < endpoints.length; i++) {
            let endpoint = endpoints[i];
            let l = { identifier: `${type}-${i}` };
            if (endpoint) {
                l.value = endpoint;
            }
            labels.push(l);
        }
        return labels;
    };

    const buildConnections = function(s, t) {
        let connections = [];
        for (let i = 0; i < t.length; i++) {
            connections.push({target: `${i}`});
        }
        return connections;
    };

    return [
        {
            // path "0"
            identifier: "scoreMaster",
            children: [
                {
                    // path "0.0"
                    identifier: "identity",
                    children: [
                        {identifier: "product", value: "S-CORE Master", type: "string"},
                        {identifier: "company", value: "EVS", access: "readWrite"},
                        {identifier: "version", value: "1.2.0", access: "readWrite", streamIdentifier: 1234567},
                        {identifier: "author", value: "g.dufour@evs.com"},
                    ]
                },
                {
                    // path "0.1"
                    identifier: "router",
                    children: [
                        {
                            // path 0.1.0
                            identifier: "matrix",
                            type: "oneToN",
                            mode: "linear",
                            targetCount: targets.length,
                            sourceCount: sources.length,                            
                            connections: buildConnections(sources, targets),
                            labels: [{basePath: "0.1.1000", description: "primary"}],                            
                        },
                        {
                            identifier: "labels",
                            // path "0.1.1000"
                            number: 1000,
                            children: [
                                {
                                    identifier: "targets",
                                    // Must be 1
                                    number: 1,
                                    children: labels(targets, "t")
                                },
                                {
                                    identifier: "sources",
                                    // Must be 2
                                    number: 2,
                                    children: labels(sources, "s")
                                },
                                {
				                    identifier: "group 1",
                                    children: [ {identifier: "sdp A", value: "A"}, {identifier: "sdp B", value: "B"}]
				                }
                            ]
                        },
                        {
                            identifier: "disconnect sources",
                            number: 1001,
                            children: defaultSources
                        }
                    ]
                },
                {
                    // path "0.2"
                    identifier: "addFunction",
                    func: args => {
                        const res = new FunctionArgument();
                        res.type = ParameterType.integer;
                        res.value = args[0].value + args[1].value;
                        return [res];
                    },
                    arguments: [
                        {
                            type: ParameterType.integer,
                            value: null,
                            name: "arg1"
                        },
                        {
                            type: ParameterType.integer,
                            value: null,
                            name: "arg2"
                        }
                    ],
                    result: [
                        {
                            type: ParameterType.integer,
                            value: null,
                            name: "changeCount"
                        }
                    ]
                }
            ]
        },
        {
            identifier: "PeakValue_2",
            type: 2,
            streamIdentifier: 4,
            streamDescriptor: {
                format: "ieeeFloat32LittleEndian",
                offset: 4
            },
            access: 1,
            maximum: 20,
            minimum: -200,
            value: -200
        }
    ];
}

module.exports = {
    jsonRoot: init
}