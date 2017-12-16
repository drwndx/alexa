/**
 *  Loads Alexa SDK
 */
const Alexa = require('alexa-sdk');

/**
 *  Default Globals
 * @type {{QUESTIONS_PER_QUIZ: number, TITLE: string}}
 */
const options = {
    QUESTIONS_PER_QUIZ: 10,
    TITLE: 'WFTDA'
};

/**
 * Language strings by language code
 * @type {{"en-US": {translation: {TITLE: string, WELCOME_LAUNCH: string, WELCOME_PRACTICE: string, WELCOME_QUIZ: string, HELP_MESSAGE: string}}}}
 */
const languageStrings =  {
    'en-US' : {
        'translation' : {
            'TITLE' : "Brewz Trains WFTDA",
            'WELCOME_LAUNCH':"Welcome to %s Flash Cards. For each card, I will ask a WFTDA based rules question, and you tell me what the answer is.  You can say practice to practice all the cards, or say quiz to take a quiz. say Practice or Quiz",
            'WELCOME_PRACTICE': "Okay, let's practice!  I will ask you all the %s questions! Simply respond with your best guess to see if you are correct. Are you ready to start?",
            'WELCOME_QUIZ': "Okay, I will ask you about all the %s questions!  Simply respond with your best guess to see if you are correct. Ready to start the quiz?",
            'HELP_MESSAGE': "I will ask you a series of questions. You can say practice to have me read all of the $s questions, your take a quiz of just %s questions."
        }
    }
};

/**
 * Question list
 * @type {*[]}
 */
const questionList = [
    { question:"<the question>", answer:["<the acceptable answer>","<the acceptable answer2>"]},
];

/**
 *
 * @param event
 * @param context
 * @param callback
 */
exports.handler = function(event, context, callback) {

    var alexa = Alexa.handler(event, context);

    alexa.resources = languageStrings;

    alexa.appID = 'amzn1.ask.skill.ba52092a-cc9a-4409-b1c5-fadbb04bd977';
    //alexa.dynamoDBTableName = '';

    alexa.registerHandlers (
        newSessionHandlers,
        startSessionHalders,
        practiceHandlers,
        quizHandlers,
        recapPracticeHandlers,
        scoreHandlers
    );

    alexa.execute();
};

/**
 * defines different states
 * @type {{START: string, PRACTICE: string, QUIZ: string, RECAP_PRACTICE: string, RECAP_QUIZ: string}}
 */
const states = {
    START : "_START",
    PRACTICE: "_PRACTICE",
    QUIZ: "_QUIZ",
    RECAP_PRACTICE: "_RECAP_PRACTICE",
    RECAP_QUIZ: "_RECAP_QUIZ"
};

/**
 * defines a new default session
 * @type {{NewSession: newSessionHandlers.NewSession}}
 */
const newSessionHandlers = {
    /**
     *
     * @constructor
     */
    'NewSession': function() {
        this.handler.state = states.START;
        this.emitWithState('NewSession');
    }
};

/**
 * defines default session vars, intent vars, and intent actions
 */
const startSessionHandlers = Alexa.CreateStateHandler(states.start, {
   'NewSession': function() {
       this.attributes['questionList'] = questionList;
       this.attributes['correctCount'] = 0;
       this.attributes['wrongCount'] = 0;
       this.attributes['wrongList'] = [];
       this.response.speak(this.t('WELCOME_LAUNCH')).listen(this.t("TITLE"));
       this.emit(':responseReady');
   },
   "PracticeIntent": function() {
       this.handler.state = states.PRACTICE;
       this.response.speak(this.t("WELCOME_PRACTICE", questionList.length)).listen(this.t("WELCOME_PRACTICE", questionList.length));
       this.emit(':responseReady');
   },
    "QuizIntent": function() {
       this.handler.state = states.QUIZ;
       this.response.speak(this.t("WELCOME_QUIZ", options.QUESTIONS_PER_QUIZ)).listen(this.t("WELCOME_QUIZ", options.QUESTIONS_PER_QUIZ));
       this.emit(':responseReady');
    },
    "AMAZON.HelpIntent": function() {
       this.response.speak(this.t("HELP_MESSAGE", questionList.length, options.QUESTIONS_PER_QUIZ)).listen(this.t("HELP_MESSAGE", questionList.length, options.QUESTIONS_PER_QUIZ));
       this.emit(':responseReady');
    },
    "AMAZON.CancelIntent": function() {
        this.response.speak("Goodbye!")
        this.emit(':responseReady');
    },
    "AMAZON.StopIntent": function() {
        this.response.speak("Goodbye!");
        this.emit(':responseReady');
    }
});



