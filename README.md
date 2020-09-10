# node-emberplus

This is version 2 of emberplus library.
An implementation of [Lawo's Ember+](https://github.com/Lawo/ember-plus) control protocol for Node.  
One of Node's great strengths is the ready availability of frameworks for various
communication protocols and user interfaces; this module allows those to be
integrated with Ember+ somewhat more easily than the reference libember C++
implementation.

This version support following ember objects : Node, Parameter, Matrix, Function, QualifiedNode,
QualifiedParameter, QualifiedMatrix, QualifiedFunction.

It has been tested with EVS XT4k and Embrionix IP solutions.

The current version has added new features to the initial commit but it also modified
the way the lib is used so that now it uses Promise

Server has been added in version 1.6.0.

Support for StreamCollection, UDP, packet stats/rate, support for tree with size higher than 8M
is available in a private branch.
If you want access to full version and/or would like support for new features or integration
with your projects, please contact Gilles Dufour - dufour.gilles@gmail.com

## Example usage

### Client

Get Full tree:

```javascript
const EmberClient = require('node-emberplus').EmberClient;
const client = new EmberClient("10.9.8.7", 9000);
client.on("error", e => {
   console.log(e);
});
client.connect()
   // Get Root info
   .then(() => client.getDirectory())
   // Get a Specific Node
   .then(() => client.getElementByPath("0.0.2"))
   .then(node => {
      console.log(node);
   })
   // Get a node by its path identifiers
   .then(() => client.getElementByPath("path/to/node"))
   .then(node => {
      console.log(node);
   })
   // Expand entire tree under node 0
   .then(() => client.expand(client.root.getElementByNumber(0)))
   .catch((e) => {
      console.log(e.stack);
   });
```

Subsribe to changes

```javascript
const {EmberClient, EmberLib} = require('node-emberplus');

const client = new EmberClient(HOST, PORT);
client.connect())
   .then(() => client.getDirectory())
   .then(() => {console.log(JSON.stringify(client.root.toJSON(), null, 4));})
   .then(() => client.getElementByPath("scoreMaster/router/labels/group 1"))
   .then(node => {
      // For streams, use subscribe
      return client.subscribe(node, update => {
         console.log(udpate);
      });
   })
   .then(() => client.getElementByPath("0.2"))
   .then(node => {
      // For non-streams a getDirectory will automatically subscribe for update
      return client.getDirectory(node, update => {
         console.log(udpate);
      });
   })
   // You can also provide a callback to the getElementByPath
   // Be carefull that subscription will be done for all elements in the path
   .then(() => client.getElementByPath("0.3", update => {console.log(update);}))
   ;
```

### Setting new value

```javascript
client = new EmberClient(LOCALHOST, PORT);
await client.connect()
await client.getDirectory();
await client.getElementByPath("0.0.1");
await client.setValue(client.root.getElementByPath("0.0.1"), "gdnet");
console.log("result", server.tree.getElementByPath("0.0.1").contents.value)
return client.disconnect().then(() => { console.log("disconnected")});
```

### Invoking Function

```javascript
const {EmberClient, EmberLib} = require('node-emberplus');

const client = new EmberClient(HOST, PORT);
client.connect())
   .then(() => client.getDirectory())
   .then(() => {console.log(JSON.stringify(client.root.toJSON(), null, 4));})
   .then(() => client.expand(client.root.getElementByNumber(0)))
   .then(() => {
      console.log(JSON.stringify(client.root.getElementByNumber(0).toJSON(), null, 4));
      const funcNode = client.root.getElementByNumber(0).getElementByNumber(5).getElementByNumber(0);
      return client.invokeFunction(funcNode, [
         new ember.FunctionArgument(EmberLib.ParameterType.integer, 1),
         new ember.FunctionArgument(EmberLib.ParameterType.integer, 7)
      ]);
   });
```

### Matrix Connection

```javascript
const {EmberClient, EmberLib} = require('node-emberplus');


const client = new EmberClient(HOST, PORT);
client.connect()
   .then(() => client.getDirectory())
   .then(() => client.getElementByPath("0.1.0"))
   .then(matrix => {
      console.log("Connecting source 1 to target 0);
      return client.matrixConnect(matrix, 0, [1]);
   })
   .then(() => client.matrixDisconnect(matrix, 0, [1]))
   .then(() => client.matrixSetConnection(matrix, 0, [0,1]))
   .then(matrix => client.getElementByPath(matrix.getPath()))
   .then(() => client.disconnect());

```

### Packet decoder

```javascript
// Simple packet decoder
const Decoder = require('node-emberplus').Decoder;
const fs = require("fs");

fs.readFile("tree.ember", (e,data) => {
   var root = Decoder(data);
});
```

### Server

```javascript
// Server
const EmberServer = require("node-emberplus").EmberServer;
const server = new EmberServer("127.0.0.1", 9000, root);
server.on("error", e => {
   console.log("Server Error", e);
});
server.on("clientError", info => {
   console.log("clientError", info);
});
server.on("matrix-disconnect", info => {
   console.log(`Client ${info.client} disconnected ${info.target} and ${info.sources}`);
}
server.on("matrix-connect", info => {
   console.log(`Client ${info.client} connected ${info.target} and ${info.sources}`);
}
server.on("matrix-change", info => {
   console.log(`Client ${info.client} changed ${info.target} and ${info.sources}`);
}
server.on("event", txt => {
   console.log("event: " + txt);
})
server.listen().then(() => { console.log("listening"); }).catch((e) => { console.log(e.stack); });
```

### Construct Tree

```javascript
const EmberServer = require("node-emberplus").EmberServer;
const {ParameterType, FunctionArgument} = require("node-emberplus").EmberLib;

const targets = [ "tgt1", "tgt2", "tgt3" ];
const sources = [ "src1", "src2", "src3" ];
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
                        labels: [{basePath: "0.1.1000", description: "primary"}]
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
                     // must be labels + 1
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
   }
];
const root = EmberServer.JSONtoTree(jsonTree);
```
