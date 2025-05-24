const { google } = require('googleapis');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const fs = require('fs');
const creds = JSON.parse(fs.readFileSync('service-account.json', 'utf-8'));
const client = new DynamoDBClient({ region: 'us-east-1' });
const ddb = DynamoDBDocumentClient.from(client);

exports.handler = async (event) => {
  //Authentication
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/documents.readonly'],
  });
  //Explicit client, not neccesary
  const authClient = await auth.getClient();
  //Docs client
  const docs = google.docs({ version: 'v1', auth: authClient});
  const documentId = 'Your Document ID';
  try {
    //Yoink the document
    const doc = await docs.documents.get({ documentId, includeTabsContent: true});
    //Trimmy Trimmy
    //Find the day's date, should change to the day after since the script is starting the day before
    const now = new Date();
    const year = now.getFullYear()-2000;
    var todaysDate = `[${now.getMonth()+1}/${now.getDate()}/${year}]`;
    var toBeRead = "";
    //Loop through every week
    const s2 = doc.data.tabs[2];
    for(let weekInd in s2.childTabs){
      const week = s2.childTabs[weekInd];
      //Loop through every day
      for(let dayInd in week.childTabs){
        const day = week.childTabs[dayInd];
        const date = day.tabProperties.title;
        //Found the right day
        if(date.includes(todaysDate)){
          //Loop through the document
          for(let item in day.documentTab.body.content){
            //Grab the paragraph
            const itemPara = day.documentTab.body.content[item].paragraph
            //Check if the paragraph actually has anything in it
            if(itemPara != null){
              if(itemPara.elements[0].textRun.content.includes("Pick One:")){
                break;
              }
              else{
                toBeRead = toBeRead + itemPara.elements[0].textRun.content;
              }
            }
          }
        }
      }
    }
    console.log(toBeRead);
    //Send to Dynamo
    await ddb.send(new PutCommand({
      TableName: 'Journal_Entries',
      Item: {
        userID: 'JohnYao',
        date: new Date().toISOString().slice(0, 10),
        goals: toBeRead
      }
    }));
    //Success and Error Codes
    return { statusCode: 200, body: 'Success :D' };
  } catch (err) {
    console.error("Error reading doc or writing to Dynamo :(", err);
    return { statusCode: 500, body: 'Failed' };
  }
};