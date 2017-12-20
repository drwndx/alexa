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
    { question:"Who am I?", answer:["BrewzTrains","Mike Rose"]},
];

/**
 *
 * @param event
 * @param context
 * @param callback
 */
exports.handler = function(event, context, callback) {

    let alexa = Alexa.handler(event, context);

    alexa.resources = languageStrings;

    alexa.appID = 'amzn1.ask.skill.ba52092a-cc9a-4409-b1c5-fadbb04bd977';
    //alexa.dynamoDBTableName = '';

    alexa.registerHandlers (
        newSessionHandlers,
        startSessionHandlers,
        practiceHandlers,
        quizHandlers,
        recapPracticeHandlers,
        recapQuizHandlers,
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
const startSessionHandlers = Alexa.CreateStateHandler(states.START, {
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
        this.response.speak("Goodbye!");
        this.emit(':responseReady');
    },
    "AMAZON.StopIntent": function() {
        this.response.speak("Goodbye!");
        this.emit(':responseReady');
    }
});

const practiceHandlers = Alexa.CreateStateHandler(states.PRACTICE, {

    'NewSession': function() {
        this.emit('NewSession');
    },

    'AMAZON.YesIntent': function() {
        let say = '';

        this.attributes['currentQuestionIndex'] = 0;

        if (this.attributes['wrongList'].length > 0) {
            this.attributes['sessionQuestionList'] = randomizeArray(this.attributes['wrongList']);
            this.attributes['wrongList'] = [];
            this.attributes['wrongCount'] = 0;
            this.attributes['correctCount'] = 0;
        } else {
            this.attributes['sessionQuestionList'] = randomizeArray(this.attributes['questionList']);
        }

        say = 'First question of ' + this.attributes['sessionQuestionList'].length + ', ';
        say += '' + this.attributes['sessionQuestionList'] [0].question + '?';
        this.response.speak(say).listen(say);
        this.emit(':responseReady');
    },

    'AnswerIntent' : function() {
        let theAnswer = '';

        if ( !this.event.request.intent.slots.theAnswer || this.event.request.intent.slots.theAnswer.value === '') {
            this.emitWithState('AMAZON.HelpIntent');
        } else {
            theAnswer = this.event.request.intent.slots.LIST_OF_ANSWERS.value;

            this.emit('rateAnswer', theAnswer, (say) => {
                let currentQuestionIndex = this.attributes['currentQuestionIndex'];

                if (currentQuestionIndex < this.attributes['sessionQuestionList'].length) {
                    say = say + 'Next question, ' + this.attributes['sessionQuestionList'][currentQuestionIndex].question + '? ';
                    this.reponse.speak(say).listen(say);
                    this.emit(':responseReady');
                } else {
                    this.handler.state = states.RECAP_PRACTICE;
                    this.emitWithState('RecapSession', say);
                }
            });
        }
    },

    'AMAZON.StopIntent': function () {
        this.response.speak('Goodbye');
        this.emit(':responseReady');
    },

    'AMAZON.HelpIntent': function () {  // practice help
        let helpText = 'please answer the question as you would normally';
        this.response.speak(helpText);
        this.emit(':responseReady');
    },

    'Unhandled': function() {  // if we get any intents other than the above
        this.response.speak('Sorry, I didn\'t get that.').listen('Try again');
        this.emit(':responseReady');
    }
});

const quizHandlers = Alexa.CreateStateHandler(states.QUIZ, {
    'NewSession': function () {
        this.emit('NewSession'); // Uses the handler in newSessionHandlers
    },
    'AMAZON.YesIntent': function () {

        var say = '';

        this.attributes['currentQuestionIndex'] = 0;

        this.attributes['wrongCount'] = 0;
        this.attributes['correctCount'] = 0;

        this.attributes['sessionQuestionList'] = randomizeArray(this.attributes['questionList'], options.QUESTIONS_PER_QUIZ);

        say = 'where is ' + this.attributes['sessionQuestionList'][0].question + '?';

        this.response.speak('First question, ' + say).listen('First question, ' + say);
        this.emit(':responseReady');

    },
    'AnswerIntent': function() {
        var myAnswer = '';

        if ( !this.event.request.intent.slots.theAnswer || this.event.request.intent.slots.theAnswer.value == '') {
            this.emitWithState('AMAZON.HelpIntent');  // emitWithState = local version of this handler

        } else {
            myAnswer = this.event.request.intent.slots.theAnswer.value;

            this.emit('rateAnswer', myAnswer, (say) => {
                var currentQuestionIndex = this.attributes['currentQuestionIndex'];

                if (currentQuestionIndex < this.attributes['sessionQuestionList'].length) {  // MORE QUESTIONS

                    say = say +  ' Next question, where is ' + this.attributes['sessionQuestionList'][currentQuestionIndex].question + '? ';

                    this.response.speak(say).listen(say);
                    this.emit(':responseReady');

                } else {   // YOU ARE DONE
                    this.handler.state = states.RECAP_QUIZ;
                    this.emitWithState('RecapSession', say);
                }
            });
        }
    },
    'AMAZON.NoIntent': function() {
        this.response.speak('Okay, see you next time, goodbye!');
        this.emit(':responseReady');
    },
    'AMAZON.StopIntent': function() {
        this.response.speak('Okay, see you next time, goodbye!');
        this.emit(':responseReady');
    },
    'Unhandled': function() {
        this.response.speak('Sorry, I didn\'t get that. Try again.').listen('Try again.');
        this.emit(':responseReady');
    }
});


const recapPracticeHandlers = Alexa.CreateStateHandler(states.RECAP_PRACTICE, {
    'NewSession': function() {
        this.emit('NewSession');
    },

    'RecapSession': function (say) {
        say = say + ' Bout completed. You got ' + this.attributes['correctCount'] + ' right out of ' + this.attributes['sessionQuestionList'].length + '. ';

        if (this.attributes['wrongCount'] === 0) {
            say += ' Great job!  You can say stop if you are done. Would you like to try the Quiz now? ';
            this.response.speak(say).listen(say);
            this.emit(':responseReady');

        } else {
            say = say + ' I have sent the ' + pluralize('question', this.attributes['wrongCount']) + 'you got wrong to your Alexa app.';
            say += ' Would you like to practice this list again now? ';


            let cardText = '';
            let wrongList = this.attributes['wrongList'];
            for (let i = 0; i < wrongList.length; i++) {
                cardText += '\n\nQuestion : ' + wrongList[i].question;
                cardText += '\nAnswer   : ' + wrongList[i].answer[0];  // show the first acceptable answer
            }

            this.response.cardRenderer('Flash Cards to Practice', cardText);
            this.response.speak(say).listen('You can say yes to practice, or say no to quit.');
            this.emit(':responseReady');
        }
    },

    'AMAZON.YesIntent': function () {
        if (this.attributes['wrongCount'] === 0) {
            this.handler.state = states.QUIZ;
            this.emitWithState('AMAZON.YesIntent');

        } else {
            this.handler.state = states.PRACTICE;
            this.emitWithState('AMAZON.YesIntent');
        }

    },

    'AMAZON.NoIntent': function () {  //
        let say = 'Okay, see you next time, goodbye!';
        this.response.speak(say);
        this.emit(':responseReady');
    },

    'Unhandled': function() {
        this.response.speak('Sorry, I didn\'t get that. Try again.').listen('Try again.');
        this.emit(':responseReady');
    }

});

const recapQuizHandlers = Alexa.CreateStateHandler(states.RECAP_QUIZ, {
    'RecapSession' : function (say) {
        let scoreSummary = '';
        scoreSummary = 'You got ' + this.attributes['correctCount'] + ' right out of ' + this.attributes['sessionQuestionList'].length + ', for a score of ' + Math.floor((100.0 *  this.attributes['correctCount'] / this.attributes['sessionQuestionList'].length)).toString() + ' % . ';

        say = say + 'You are done.' + scoreSummary.replace('\n','') + ' I have sent this result to your Alexa App. ';
        if (this.attributes['WrongCount'] === 0) {
            say += ' Great Job! You can say stop if you are done. Would you like to start over? ';
        } else {
            say += ' Would you like to practice some more now?';
        }

        this.response.cardRenderer(options.TITLE +  ' Flash Cards - Quiz Result', scoreSummary);
        this.response.speak(say, 'Say yes to practice, or say no to quit.');
        this.emit(':responseReady');
    },


    'AMAZON.YesIntent': function () {
        if (this.attributes['wrongCount'] === 0) {

            this.handler.state = states.START;
            this.emitWithState('NewSession');

        } else {
            this.handler.state = states.PRACTICE;
            this.emitWithState('AMAZON.YesIntent');
        }

    },
    'AMAZON.NoIntent': function () {  //
        let say = 'Okay, see you next time, goodbye!';
        this.response.speak(say);
        this.emit(':responseReady');
    },
    'Unhandled': function() {
        this.response.speak('Sorry, I didn\'t get that. Try again.').listen('Try again.');
        this.emit(':responseReady');
    }

});

const scoreHandlers  = {

    'rateAnswer': function (answerGuess, callback) {
        let say = '';
        let currentQuestionIndex = this.attributes['currentQuestionIndex'];
        let currentQuestion = this.attributes['sessionQuestionList'][currentQuestionIndex];
        if (currentQuestion.answer.indexOf(answerGuess) >= 0 ){
            this.attributes['correctCount'] += 1;

            say = answerGuess + ' is right!';
        } else {
            this.attributes['wrongCount'] += 1;

            let wrongList = this.attributes['wrongList'];
            wrongList.push(currentQuestion);
            this.attributes['wrongList'] = wrongList;

            say = answerGuess + ' is wrong! The correct answer to the question';
        }
        currentQuestionIndex += 1;
        this.attributes['currentQuestionIndex'] = currentQuestionIndex;

        callback(say);
    },

};

function randomizeArray(myArray, recordCount) {
    let sliceLimit = myArray.length;
    if (recordCount) {
        sliceLimit = recordCount;
    }
    let m = myArray.length, t, i;

    while (m) {

        i = Math.floor(Math.random() * m--);

        t = myArray[m];
        myArray[m] = myArray[i];
        myArray[i] = t;

    }

    return myArray.slice(0, sliceLimit);
}

function pluralize(word, qty) {
    let newWord = '';
    if (qty === 1) {
        newWord = word;
    } else {
        newWord = word + 's';
    }
    return qty.toString() + ' ' + newWord;
}