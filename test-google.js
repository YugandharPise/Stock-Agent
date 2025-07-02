const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/documents',
];

const CREDENTIALS_PATH = path.join(__dirname, 'oauth2-credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

async function authorize() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error("Missing oauth2-credentials.json");
  }
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oAuth2Client.setCredentials(token);
    console.log("Token already exists and loaded.");
    return;
  }

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log("Authorize this app by visiting this URL:");
  console.log(authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question("Enter the code from the page here: ", async (code) => {
    rl.close();
    try {
      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
      console.log("Token saved to " + TOKEN_PATH);
    } catch (err) {
      console.error("Error retrieving access token", err.message);
    }
  });
}

authorize().catch(console.error);
