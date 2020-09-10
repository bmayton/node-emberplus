const COMMAND_SUBSCRIBE     = 30;
const COMMAND_UNSUBSCRIBE   = 31;
const COMMAND_GETDIRECTORY  = 32;
const COMMAND_INVOKE        = 33;

const COMMAND_STRINGS = {
    [COMMAND_SUBSCRIBE]: "subscribe",
    [COMMAND_UNSUBSCRIBE]: "unsubscribe",
    [COMMAND_GETDIRECTORY]: "getdirectory",
    [COMMAND_INVOKE]: "invoke"
};

module.exports = {
    COMMAND_SUBSCRIBE,
    COMMAND_UNSUBSCRIBE,
    COMMAND_GETDIRECTORY,
    COMMAND_INVOKE,
    Subscribe:      COMMAND_SUBSCRIBE,
    Unsubscribe:    COMMAND_UNSUBSCRIBE,
    GetDirectory:   COMMAND_GETDIRECTORY,
    Invoke:         COMMAND_INVOKE,
    COMMAND_STRINGS
};