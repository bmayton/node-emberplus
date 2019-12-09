# node-emberplus

This is an implementation of [Lawo's
Ember+](https://github.com/Lawo/ember-plus) control protocol for Node.  One of
Node's great strengths is the ready availability of frameworks for various
communication protocols and user interfaces; this module allows those to be
integrated with Ember+ somewhat more easily than the reference libember C++
implementation.

This version support following ember objects : Node, Parameter, Matrix, QualifiedNode,
QualifiedParameter, QualifiedMatrix, QualifiedFunction.

It has been tested with EVS XT4k and Embrionix IP solutions.

The current version has added new features to the initial commit but it also modified
the way the lib is used so that now it uses Promise

Server has been added in version 1.6.0.

## Example usage

### Client
```javascript
const DeviceTree = require('emberplus').DeviceTree;
var root;
var tree = new DeviceTree("10.9.8.7", 9000);
tree.connect()
.then(() => { 
   return tree.getDirectory();
})
.then((r) => { 
   root = r ;
   return tree.expand(r.elements[0]);
})
.then(() => {
   console.log("done"); 
})
.catch((e) => {
   console.log(e.stack);
});
```

### Function
```javascript
const client = new DeviceTree(HOST, PORT);
client.connect())
.then(() => client.getDirectory())
.then(() => {console.log(JSON.stringify(client.root.toJSON(), null, 4));})
.then(() => client.expand(client.root.elements[0]))
.then(() => {
    console.log(JSON.stringify(client.root.elements[0].toJSON(), null, 4));
    let func;
    if (TINYEMBER) {
        func = client.root.elements[0].children[4].children[0];
    }
    else {
        func = client.root.elements[0].children[2];
    }
    return client.invokeFunction(func, [
        new ember.FunctionArgument(ember.ParameterType.integer, 1),
        new ember.FunctionArgument(ember.ParameterType.integer, 7)
    ]);
})
```

### Packet decoder
```javascript
// Simple packet decoder
const Decoder = require('emberplus').Decoder;
const fs = require("fs");

fs.readFile("tree.ember", (e,data) => {
   var root = Decoder(data);
});
```
### Server

```javascript
// Server
const TreeServer = require("emberplus").TreeServer;
const server = new TreeServer("127.0.0.1", 9000, root);
server.on("error", e => {
   console.log("Server Error", e);
});
server.on("clientError", info => {
   console.log("clientError", info);
});
server.listen().then(() => { console.log("listening"); }).catch((e) => { console.log(e.stack); });
```

### Construct Tree
```javascript
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
const jsonTree = [
   {
      // path "0"
      identifier: "GDNet Tree",
      children: [
            {
               // path "0.0"
               identifier: "identity",
               children: [
                  {identifier: "product", value: "gdnet core"},
                  {identifier: "company", value: "GDNet", access: "readWrite"},
                  {identifier: "version", value: "1.2.0"},
                  {identifier: "author", value: "dufour.gilles@gmail.com"},
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
               ]
            }
      ]
   }
];
const root = TreeServer.JSONtoTree(jsonTree);
```

