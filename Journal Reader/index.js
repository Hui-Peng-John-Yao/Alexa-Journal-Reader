const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: "us-east-1" });
const ddb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  console.log("✅ Lambda triggered");

  //"Open" aka launch check
  if (event.request?.type === "LaunchRequest") {
    return speak("Welcome to John's Journal!");
  }
  //Dynamo connection
  if (event.request?.type === "IntentRequest" && event.request.intent.name === "ReadEntry") {
    //Today's Date
    var today = new Date();
    var dd = String(today.getDate()).padStart(2, '0');
    var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = today.getFullYear();
    today = yyyy + '-'+ mm + '-' + dd;
    console.log(today);
    //Query
    const params = {
      TableName: "Journal_Entries",
      Key: {
        userID: "JohnYao",
        date: today,
      },
    };

    try {
      const result = await ddb.send(new GetCommand(params));
      const entry = result.Item?.goals || "Sorry, no journal entry found.";
      return speak(entry);
    } catch (err) {
      console.error("❌ DynamoDB error:", err);
      return speak("Something went wrong reading your journal.");
    }
  }
  //Oops
  return speak("Sorry, I didn’t understand that request.");
};

//Returns a json representing Alexa speech
function speak(text) {
  return {
    version: "1.0",
    response: {
      outputSpeech: {
        type: "PlainText",
        text: text,
      },
      shouldEndSession: true,
    },
  };
}
