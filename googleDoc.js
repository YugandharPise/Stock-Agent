const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { google } = require("googleapis");
const { v4: uuidv4 } = require("uuid");
const dayjs = require("dayjs");

const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/documents",
];

const CREDENTIALS_PATH = path.join(__dirname, "oauth2-credentials.json");
const TOKEN_PATH = path.join(__dirname, "token.json");
const DRIVE_PARENT_FOLDER_ID = "1IsjdBQapOOcJZcHW7RGRU-avLMCOf79S";
const DRIVE_REPORTS_FOLDER_ID = "1VUnSvxReJjrPXVF7haGDu3HTq8UzyUmn";

async function uploadWithRetry(drive, fileMetadata, media, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const uploaded = await drive.files.create({
        resource: fileMetadata,
        media,
        fields: 'id',
      });
      return uploaded; // success
    } catch (err) {
      console.warn(`Upload attempt ${attempt} failed: ${err.message}`);
      if (attempt === maxRetries) throw err; // final fail
      await new Promise(r => setTimeout(r, 1000 * attempt)); // exponential backoff
    }
  }
}

async function authorize() {
  try {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      throw new Error("Credentials file not found at " + CREDENTIALS_PATH);
    }
    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    if (!client_secret || !client_id || !redirect_uris) {
      throw new Error("Invalid credentials file structure");
    }
    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    if (fs.existsSync(TOKEN_PATH)) {
      const token = fs.readFileSync(TOKEN_PATH, "utf8");
      oAuth2Client.setCredentials(JSON.parse(token));
      return oAuth2Client;
    }

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });
    console.log("Authorize this app by visiting this URL: " + authUrl);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const code = await new Promise((resolve) => {
      rl.question("Enter the code from that page: ", (code) => {
        rl.close();
        resolve(code);
      });
    });

    if (!code) {
      throw new Error("No authorization code provided");
    }

    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    console.log("Token stored to " + TOKEN_PATH);
    return oAuth2Client;
  } catch (error) {
    console.error("Authorization error: " + error.message);
    throw error;
  }
}

async function getDocumentEndIndex(documentId, docs) {
  try {
    const doc = await docs.documents.get({ documentId });
    const body = doc.data.body.content;
    if (!body || body.length === 0) return 1;
    return body[body.length - 1].endIndex - 1;
  } catch (error) {
    console.error("Error getting document end index: " + error.message);
    throw error;
  }
}

async function saveImagesToGoogleDoc(stockName, stockSymbol, imagePaths = [], userImagePath = null, comment = "") {
  try {
    if (!stockName || typeof stockName !== "string") {
      throw new Error("Invalid stock name provided");
    }

    const auth = await authorize();
    const drive = google.drive({ version: "v3", auth });
    const docs = google.docs({ version: "v1", auth });

    const timestamp = dayjs().format("YYYY-MM-DD_HH-mm-ss");
    const docTitle = `${stockSymbol}-${timestamp}`;

    console.log("Creating Google Document...");

    const doc = await docs.documents.create({
      requestBody: {
        title: docTitle,
        documentStyle: {
          marginTop: { magnitude: 36, unit: "PT" },
          marginBottom: { magnitude: 36, unit: "PT" },
          marginLeft: { magnitude: 36, unit: "PT" },
          marginRight: { magnitude: 36, unit: "PT" }
        }
      }
    });

    const documentId = doc.data.documentId;
    if (!documentId) {
      throw new Error("Failed to create Google Doc");
    }

    // Make it public:
    await drive.permissions.create({
      fileId: documentId,
      requestBody: { role: 'reader', type: 'anyone' },
    });

    console.log("Google Document created: " + docTitle);

    if (comment && comment.trim()) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: comment + "\n\n",
              },
            },
          ],
        },
      });
      console.log("Inserted user comment.");
    }

    let pdfPublicUrl = null;
    const sortedImages = imagePaths;
    const uploadedImageFileIds = [];
    let imageCounter = 0;
    console.log(`Inserting images into Google Document.`);
    // user-uploaded image
      if (userImagePath && fs.existsSync(userImagePath)) {
        const fileMetadata = { name: `${uuidv4()}.png`, parents: [DRIVE_PARENT_FOLDER_ID] };
        const media = { mimeType: "image/png", body: fs.createReadStream(userImagePath) };
        const uploaded = await uploadWithRetry(drive, fileMetadata, media);
        await drive.permissions.create({ fileId: uploaded.data.id, requestBody: { role: "reader", type: "anyone" } });
        await new Promise(resolve => setTimeout(resolve, 1000));
        const publicUrl = `https://drive.google.com/uc?id=${uploaded.data.id}`;

        const insertIndex = await getDocumentEndIndex(documentId, docs);
        await docs.documents.batchUpdate({
          documentId,
          requestBody: {
            requests: [
              { insertPageBreak: { location: { index: insertIndex } } },
              {
                insertInlineImage: {
                  location: { index: insertIndex + 1 },
                  uri: publicUrl,
                  objectSize: {
                    width: { magnitude: 500, unit: "PT" },
                    height: { magnitude: 500, unit: "PT" }
                  }
                }
              },
              {
                insertText: { location: { index: insertIndex + 2 }, text: "\n" }
              }
            ]
          }
        });
        uploadedImageFileIds.push(uploaded.data.id);
      }
    for (const filePath of sortedImages) {
      if (!fs.existsSync(filePath)) continue;

      const ext = path.extname(filePath).toLowerCase();
      if (ext === ".pdf") {
        // same PDF logic
        const pdfName = `${stockName}-${timestamp}-report.pdf`;
        const fileMetadata = { name: pdfName, parents: [DRIVE_REPORTS_FOLDER_ID] };
        const media = { mimeType: "application/pdf", body: fs.createReadStream(filePath) };
        const uploaded = await uploadWithRetry(drive, fileMetadata, media);
        if (!uploaded.data.id) continue;

        await drive.permissions.create({ fileId: uploaded.data.id, requestBody: { role: "reader", type: "anyone" } });
        pdfPublicUrl = `https://drive.google.com/file/d/${uploaded.data.id}/view`;

        await docs.documents.batchUpdate({
          documentId,
          requestBody: {
            requests: [
              { insertText: { location: { index: 1 }, text: "Full Stock Report PDF:\n" } },
              { updateTextStyle: { range: { startIndex: 1, endIndex: 24 }, textStyle: { link: { url: pdfPublicUrl } }, fields: "link" } },
              { insertText: { location: { index: 24 }, text: "\n\n" } }
            ]
          }
        });
        console.log("Uploaded and linked stock report PDF.");
        continue;
      }

      // upload images
      const fileMetadata = { name: `${uuidv4()}.png`, parents: [DRIVE_PARENT_FOLDER_ID] };
      const media = { mimeType: "image/png", body: fs.createReadStream(filePath) };
      const uploaded = await uploadWithRetry(drive, fileMetadata, media);
      if (!uploaded.data.id) continue;

      await drive.permissions.create({ fileId: uploaded.data.id, requestBody: { role: "reader", type: "anyone" } });
      await new Promise(resolve => setTimeout(resolve, 1000));
      uploadedImageFileIds.push(uploaded.data.id);

      const publicUrl = `https://drive.google.com/uc?id=${uploaded.data.id}`;
      const insertIndex = await getDocumentEndIndex(documentId, docs);

      const requests = [
        {
          insertInlineImage: {
            location: { index: insertIndex },
            uri: publicUrl,
            objectSize: {
              width: { magnitude: 500, unit: "PT" },
              height: { magnitude: 500, unit: "PT" }
            }
          }
        },
        {
          insertText: {
            location: { index: insertIndex + 1 },
            text: "\n",
          },
        }
      ];

      imageCounter++;

      if (imageCounter % 2 === 0) {
        requests.push({
          insertPageBreak: { location: { index: insertIndex + 2 } }
        });
      }

      await docs.documents.batchUpdate({ documentId, requestBody: { requests } });
    }

    /* download the final PDF
    try {
      const screenshotsDir = path.join(__dirname, "screenshots");
      if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, { recursive: true });
      const pdfPath = path.join(screenshotsDir, `${docTitle}.pdf`);
      const dest = fs.createWriteStream(pdfPath);
      await drive.files.export({ fileId: documentId, mimeType: "application/pdf" }, { responseType: "stream" })
        .then(res => new Promise((resolve, reject) => {
          res.data.pipe(dest)
            .on("finish", () => {
              console.log("Google Doc PDF saved locally to " + pdfPath);
              resolve();
            })
            .on("error", reject);
        }));
    } catch (err) {
      console.error("Error downloading PDF: " + err.message);
    } */

    console.log("Google Document ready at: https://docs.google.com/document/d/" + documentId);
    
    return {
      docUrl: `https://docs.google.com/document/d/${documentId}`,
      uploadedImageFileIds
    };

  } catch (error) {
    console.error("Error in saveImagesToGoogleDoc: " + error.message);
    throw error;
  }
}


module.exports = { saveImagesToGoogleDoc, authorize };
