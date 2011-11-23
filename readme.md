# ofproxy-node

Ofproxy-node is an OpenFlow protocol proxy for Node.
It acts as a proxy between controller and switches, and generates events from OpenFlow messages.

## Dependencies

node-uuid (https://github.com/broofa/node-uuid/)

oflib-node (https://github.com/TrafficLab/oflib-node)

## Usage

    var proxy = new ofproxy.Proxy(controllerPort [, controllerHost]);
    proxy.start(proxyPort);
    
    proxy.on(event, function(arg) {
        ...
    });

## Events

#### ofProxySessionStart

Sent when a switch starts a new session via the proxy.

    {
        "id" : Buffer,      // unique identifier (UUID) for this session
        "at" : Date         // timestamp of the event
        "address" : "IP",   // IP address of the switch
        "port" : port       // port of the switch
    }

#### ofProxySessionEnd

Sent when a session is closed by either party.

    {
        "id" : Buffer,                  // unique identifier (UUID) for this session
        "at" : Date,                    // timestamp of the event
        "by" : "switch" | "controller"  // the party which closed the session
    }

#### ofProxyMessage

Sent when either party sends a valid OpenFlow message.

    {
        "id" : Buffer,                   // identifier of the session this message was sent in
        "at" : Date,                     // timestamp of the event
        "by" : "switch" | "controller",  // the party sending the message
        "message" : Object,              // message object by oflib-node
        "warnings" : ["description"]     // (optional) if there were semantic warnings in the message, they are listed here
    }

#### ofProxyError

Sent when either party sent an invalid OpenFlow message.

    {
        "id" : Buffer,                   // identifier of the session this message was sent in
        "at" : Date                      // timestamp of the event
        "by" : "switch" | "controller"   // the party sending the message
        "error" : "error"                // description of the error
    }