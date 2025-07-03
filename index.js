const express = require('express');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const { takeAllScreenshots } = require('./screenshot');
const { saveImagesToGoogleDoc } = require('./googleDoc');

const app = express();
const PORT = 3000;

// SSE
const clients = [];

app.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();
  res.write('retry: 10000\n\n');
  clients.push(res);
  req.on('close', () => {
    const i = clients.indexOf(res);
    if (i !== -1) clients.splice(i, 1);
  });
});

function broadcast(message) {
  for (const client of clients) {
    client.write(`data: ${message}\n\n`);
  }
}

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());

app.post('/screenshot', async (req, res) => {
  const startTime = Date.now();
  let tempFolderPath = null;
  let userImagePath = null;

  try {
    const stockName = req.body.stockName?.trim();
    const stockSymbol = req.body.stockSymbol?.trim();
    const comment = req.body.comment?.trim() || '';
    const userImage = req.files?.image;

    if (!stockName || !stockSymbol) {
      return res.status(400).send('Missing stock name or symbol.');
    }

    console.log("Starting screenshot and document creation for: " + stockName);
    broadcast(`Starting process for ${stockName} (${stockSymbol})`);

    // Take screenshots
    const screenshots = await takeAllScreenshots(stockName, stockSymbol);
    if (!screenshots || screenshots.length === 0) {
      return res.status(500).send('No screenshots captured');
    }
    tempFolderPath = path.dirname(screenshots[0]);

    if (userImage) {
      userImagePath = path.join(tempFolderPath, 'user_uploaded_image.png');
      await userImage.mv(userImagePath);
      console.log("User image uploaded to: " + userImagePath);
      broadcast("User image uploaded.");
    }

    const docUrl = await saveImagesToGoogleDoc(stockName, screenshots, userImagePath, comment);

    const endTime = Date.now();
    const totalTimeSeconds = ((endTime - startTime) / 1000).toFixed(2);

    console.log("Completed document creation in " + totalTimeSeconds + " seconds.");
    broadcast("Completed. Document ready.");

    res.status(200).send(`Done. Document created: ${docUrl}\nTotal time: ${totalTimeSeconds} seconds`);
  } catch (err) {
    console.error("Error during screenshot or document creation: " + err.message);
    broadcast("Error: " + err.message);
    res.status(500).send("Failed to complete the process: " + err.message);
  } finally {
    try {
      if (userImagePath && fs.existsSync(userImagePath)) {
        fs.unlinkSync(userImagePath);
        console.log("Deleted user uploaded image: " + userImagePath);
      }
      if (tempFolderPath && fs.existsSync(tempFolderPath)) {
        const files = fs.readdirSync(tempFolderPath);
        for (const file of files) {
          const filePath = path.join(tempFolderPath, file);
          fs.unlinkSync(filePath);
          console.log("Deleted temporary file: " + filePath);
        }
        fs.rmdirSync(tempFolderPath);
        console.log("Deleted temporary folder: " + tempFolderPath);
      }
    } catch (cleanupErr) {
      console.error("Error during cleanup: " + cleanupErr.message);
    }
  }
});

app.listen(PORT, () => {
  console.log("Server running at http://localhost:" + PORT);
});
