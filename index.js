const express = require('express');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');
const { takeAllScreenshots } = require('./screenshot');
const { saveImagesToGoogleDoc, authorize } = require('./googleDoc');

const app = express();
const PORT = 3000;

const runningJobs = new Set();

// SSE clients
let clients = [];

// patch console.log to also send to SSE
const originalLog = console.log;
console.log = (...args) => {
  originalLog(...args);
  const message = args.join(" ");
  for (const res of clients) {
    res.write(`data: ${message}\n\n`);
  }
};

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());

// SSE endpoint
app.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.flushHeaders();
  res.write("retry: 10000\n\n");

  clients.push(res);

  req.on("close", () => {
    clients = clients.filter(c => c !== res);
  });
});

app.post('/screenshot', async (req, res) => {
  res.setTimeout(15 * 60 * 1000); // 15 min
  const startTime = Date.now();
  let tempFolderPath = null;
  let userImagePath = null;
  let uploadedImageFileIds = []; 
  let docUrl = null;

  try {
    const stockName = req.body.stockName?.trim();
    const stockSymbol = req.body.stockSymbol?.trim();
    const comment = req.body.comment?.trim() || '';
    const userImage = req.files?.image;

    if (!stockName) {
      return res.status(400).send('Missing stock name');
    }

    if (runningJobs.has(stockName)) {
      console.warn(`Duplicate request for stock ${stockName} ignored`);
      return res.status(409).send(`A job is already running for ${stockName}`);
    }
    runningJobs.add(stockName);

    console.log("Starting screenshot and document creation for: " + stockName);

    const screenshots = await takeAllScreenshots(stockName, stockSymbol);

    if (!screenshots || screenshots.length === 0) {
      return res.status(500).send('No screenshots captured');
    }

    tempFolderPath = path.dirname(screenshots[0]);

    if (userImage) {
      userImagePath = path.join(tempFolderPath, 'user_uploaded_image.png');
      await userImage.mv(userImagePath);
      console.log("User image uploaded to: " + userImagePath);
    }

    // Use correct destructuring and store values
    const result = await saveImagesToGoogleDoc(stockName, stockSymbol, screenshots, userImagePath, comment);
    docUrl = result.docUrl;
    uploadedImageFileIds = result.uploadedImageFileIds;

    const endTime = Date.now();
    const totalTimeSeconds = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`Completed document creation in ${totalTimeSeconds} seconds.`);

    // send final doc link as a special SSE event
    for (const c of clients) {
      c.write(`event: done\ndata: ${docUrl}\n\n`);
    }

    res.status(200).send(`Done. Document created: ${docUrl}\nTotal time: ${totalTimeSeconds} seconds`);

  } catch (err) {
    console.error("Error during screenshot or document creation: " + err.message);
    res.status(500).send("Failed to complete the process: " + err.message);
  } finally {
    if (req.body.stockName) {
      runningJobs.delete(req.body.stockName.trim());
    }

    try {
      // Local cleanup
      const screenshotsBase = path.join(__dirname, 'screenshots');
      if (fs.existsSync(screenshotsBase)) {
        fs.rmSync(screenshotsBase, { recursive: true, force: true });
        console.log("Deleted entire screenshots folder.");
      }

      // Delete entire Drive folder contents
      const auth = await authorize();
      const drive = google.drive({ version: 'v3', auth });

      const DRIVE_PARENT_FOLDER_ID = '1sVF6hhlGdBnLtd8jj7a4LcgU8wXnq9OB'; // Replace with your actual ID

      const listResponse = await drive.files.list({
        q: `'${DRIVE_PARENT_FOLDER_ID}' in parents`,
        fields: 'files(id, name)',
      });

      const filesInFolder = listResponse.data.files || [];

      if (filesInFolder.length === 0) {
        console.log(`No files found in Drive folder ${DRIVE_PARENT_FOLDER_ID}.`);
      } else {
        for (const file of filesInFolder) {
          try {
            await drive.files.delete({ fileId: file.id });
          } catch (e) {
            console.warn(`Could not delete Drive file ${file.id}: ${e.message}`);
          }
        }
        console.log("Cleared all contents of Drive folder");
      }

    } catch (cleanupErr) {
      console.error("Error during cleanup: " + cleanupErr.message);
    }
  }
});

app.listen(PORT, () => {
  console.log("Server running at http://localhost:" + PORT);
});
