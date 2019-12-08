const DeviceTree = require("../").DeviceTree;
const ember = require("../ember");

const HOST = "192.168.4.4";
const PORT = 9092;

client = new DeviceTree(HOST, PORT);
client.connect()
.then(() => client.getDirectory())
.then(() => client.expand(client.root.elements[0]))
.then(() => {
    //console.log(client.root.elements[0].children[4].children[2].toJSON());
    console.log(JSON.stringify(client.root.elements[0].children[4].toJSON(), null, 4));
    return client.invokeFunction(client.root.elements[0].children[4].children[0], [
        new ember.FunctionArgument(ember.ParameterType.integer, 1),
        new ember.FunctionArgument(ember.ParameterType.integer, 7)
    ]);
})
.then(result => {
    console.log(result);
});
