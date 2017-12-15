const Alexa = require('alexa-sdk');

exports.handler = function(event, context, callback) {

    let alexa = Alexa.handler(event, context);

    // alexa.dynamoDBTableName = 'YourTableName'; // creates new table for userid:session.attributes

    alexa.registerHandlers(handlers);
    alexa.execute();
};

const colors = ["red", "blue", "green"];

const handlers = {
    'LaunchRequest': function () {
        this.emit('MyIntent');
    },

    'MyIntent': function () {
        this.emit(':tell', 'Hello World from Alexa!');
    },
    'GenColor': function () {
        let color = colors[Math.floor(Math.random() * colors.length)];
        this.emit(':tell', 'Your color is '+color);
    }
};
