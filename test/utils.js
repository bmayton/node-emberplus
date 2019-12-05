const {ParameterAccess} = require("../ember");

const init = function(_src,_tgt) {
    const targets = _tgt === undefined ? [ "tgt1", "tgt2", "tgt3" ] : _tgt;
    const sources = _src === undefined ? [ "src1", "src2", "src3" ] : _src;
    const labels = function(endpoints) {
        let labels = [];
        for (let i = 0; i < endpoints.length; i++) {
            let endpoint = endpoints[i];
            let l = { identifier: `Label-${i}` };
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
                        {identifier: "product", value: "S-CORE Master"},
                        {identifier: "company", value: "EVS", access: "readWrite"},
                        {identifier: "version", value: "1.2.0"},
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
                            labels: ["0.1.1000"]
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
                                    children: labels(targets)
                                },
                                {
                                    identifier: "sources",
                                    // Must be 2
                                    number: 2,
                                    children: labels(sources)
                                },
                                {
				    identifier: "group 1",
                                    children: [ {identifier: "sdp A", value: "A"}, {identifier: "sdp B", value: "B"}]
				}
                            ]
                        }
                    ]
                }
            ]
        }
    ];
}

module.exports = {
    jsonRoot: init
}