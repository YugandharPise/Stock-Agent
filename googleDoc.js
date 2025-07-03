import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { google } from "googleapis";
const credentials = JSON.parse(fs.readFileSync("./oauth2-credentials.json", "utf8"));
const token = JSON.parse(fs.readFileSync("./token.json", "utf8"));

const DRIVE_PARENT_FOLDER_ID = "1sVF6hhlGdBnLtd8jj7a4LcgU8wXnq9OB"; // Stock Screenshots
const DRIVE_REPORTS_FOLDER_ID = "1dclQ2fHWH-bBdjFIS3fKOdV_pCTHmIN1"; // Stock Reports

// Setup OAuth2
const { client_secret, client_id, redirect_uris } = credentials.installed;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
oAuth2Client.setCredentials(token);

const drive = google.drive({ version: "v3", auth: oAuth2Client });
const docs = google.docs({ version: "v1", auth: oAuth2Client });

export async function saveImagesToGoogleDoc(stockName, timestamp, comment, screenshotsDir, userImagePath) {
  try {
    // Create new Google Doc
    const docTitle = `${stockName} - ${timestamp}`;
    const createRes = await docs.documents.create({
      requestBody: { title: docTitle },
    });
    const documentId = createRes.data.documentId;
    console.log("Created Google Doc: " + docTitle);

    const imagePaths = [];

    // gather all images (png/jpg)
    const files = await fs.promises.readdir(screenshotsDir);
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (ext === ".png" || ext === ".jpg" || ext === ".jpeg") {
        imagePaths.push(path.join(screenshotsDir, file));
      }
    }

    // sort images for logical ordering
    const sortedImages = [...imagePaths].sort((a, b) => {
      const priorities = [
        "moneycontrol_scroll",
        "moneycontrol_financials",
        "moneycontrol_shareholding",
      ];
      const getPriority = (name) => {
        for (let i = 0; i < priorities.length; i++) {
          if (path.basename(name).startsWith(priorities[i])) return i;
        }
        return 99; // others go last
      };
      const pa = getPriority(a);
      const pb = getPriority(b);
      if (pa !== pb) return pa - pb;
      // within group, numeric order
      const na = a.match(/\d+/);
      const nb = b.match(/\d+/);
      return (na ? +na[0] : 0) - (nb ? +nb[0] : 0);
    });

    let uploadedImageFileIds = [];
    let imageCounter = 0;

    for (const filePath of sortedImages) {
      const fileMetadata = {
        name: `${uuidv4()}.png`,
        parents: [DRIVE_PARENT_FOLDER_ID],
      };
      const media = {
        mimeType: "image/png",
        body: fs.createReadStream(filePath),
      };
      const uploaded = await drive.files.create({
        resource: fileMetadata,
        media,
        fields: "id",
      });
      if (!uploaded.data.id) continue;

      await drive.permissions.create({
        fileId: uploaded.data.id,
        requestBody: { role: "reader", type: "anyone" },
      });

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
              height: { magnitude: 500, unit: "PT" },
            },
          },
        },
        {
          insertText: {
            location: { index: insertIndex + 1 },
            text: "\n",
          },
        },
      ];

      imageCounter++;
      if (imageCounter % 2 === 0) {
        requests.push({
          insertPageBreak: { location: { index: insertIndex + 2 } },
        });
      }

      await docs.documents.batchUpdate({
        documentId,
        requestBody: { requests },
      });
      console.log("Inserted image: " + path.basename(filePath));
    }

    // insert comment if present
    if (comment && comment.trim() !== "") {
      const insertIndex = await getDocumentEndIndex(documentId, docs);
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: { index: insertIndex },
                text: `\n\nComment: ${comment}\n\n`,
              },
            },
          ],
        },
      });
      console.log("Inserted user comment.");
    }

    // insert user-uploaded image
    if (userImagePath && fs.existsSync(userImagePath)) {
      const fileMetadata = {
        name: `${uuidv4()}.png`,
        parents: [DRIVE_PARENT_FOLDER_ID],
      };
      const media = {
        mimeType: "image/png",
        body: fs.createReadStream(userImagePath),
      };
      const uploaded = await drive.files.create({
        resource: fileMetadata,
        media,
        fields: "id",
      });
      await drive.permissions.create({
        fileId: uploaded.data.id,
        requestBody: { role: "reader", type: "anyone" },
      });
      uploadedImageFileIds.push(uploaded.data.id);

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
                  height: { magnitude: 500, unit: "PT" },
                },
              },
            },
            {
              insertText: {
                location: { index: insertIndex + 2 },
                text: "\n",
              },
            },
          ],
        },
      });
      console.log("Inserted user-uploaded image.");
    }

    // Export doc to PDF
    const pdfPath = path.join(screenshotsDir, `${docTitle}.pdf`);
    const dest = fs.createWriteStream(pdfPath);
    const driveResponse = await drive.files.export(
      { fileId: documentId, mimeType: "application/pdf" },
      { responseType: "stream" }
    );
    await new Promise((resolve, reject) => {
      driveResponse.data
        .on("end", () => {
          console.log("Exported Google Doc to PDF.");
          resolve();
        })
        .on("error", (err) => {
          console.error("Error exporting PDF: " + err.message);
          reject(err);
        })
        .pipe(dest);
    });

    // upload final exported PDF to Stock Reports folder
    const pdfFileMetadata = {
      name: `${docTitle}.pdf`,
      parents: [DRIVE_REPORTS_FOLDER_ID],
    };
    const pdfMedia = {
      mimeType: "application/pdf",
      body: fs.createReadStream(pdfPath),
    };
    const pdfUploaded = await drive.files.create({
      resource: pdfFileMetadata,
      media: pdfMedia,
      fields: "id",
    });
    await drive.permissions.create({
      fileId: pdfUploaded.data.id,
      requestBody: { role: "reader", type: "anyone" },
    });
    console.log("Uploaded stock report PDF to Stock Reports folder.");

    // cleanup: delete temporary images from Drive
    for (const fileId of uploadedImageFileIds) {
      try {
        await drive.files.delete({ fileId });
        console.log("Deleted temporary image from Drive: " + fileId);
      } catch (e) {
        console.warn("Could not delete image with id " + fileId + ": " + e.message);
      }
    }

    // cleanup: delete screenshots folder
    if (fs.existsSync(screenshotsDir)) {
      fs.rmSync(screenshotsDir, { recursive: true, force: true });
      console.log("Deleted local screenshots folder: " + screenshotsDir);
    }

    return pdfUploaded.data.id;
  } catch (err) {
    console.error("Error in saveImagesToGoogleDoc: " + err.message);
    throw err;
  }
}

async function getDocumentEndIndex(documentId, docs) {
  const doc = await docs.documents.get({ documentId });
  const body = doc.data.body;
  return body.content[body.content.length - 1].endIndex - 1;
}
