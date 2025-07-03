# 📈 Stock Agent

**A powerful automation agent for capturing stock screenshots, generating stock reports, and uploading them to Google Drive and Google Docs — fully automated.**

---

## 🚀 Setup Guide (From Scratch)

If your system is reset or damaged, follow these simple steps to rebuild the agent:

---

## 1️⃣ Install Prerequisites

✅ **Install Node.js (latest version)**
👉 [Download Node.js](https://nodejs.org/)

---

## 2️⃣ Create Project Directory

```bash
mkdir stock-screenshot-agent
cd stock-screenshot-agent
```

---

## 3️⃣ Initialize the Project

```bash
npm init -y
```

✅ *This will create a `package.json` file.*

---

## 4️⃣ Install Dependencies

```bash
npm install express playwright googleapis multer uuid dayjs express-fileupload axios
```

✅ *You should see a `node_modules` folder appear.*

---

## 5️⃣ Install Playwright Browsers

```bash
npx playwright install
```

✅ *This will download the necessary Chromium/Firefox/WebKit engines.*

---

## 6️⃣ Configure Persistent Profiles

* Inside the parent folder, run:

```bash
node login.js
```

✅ *Use this Chrome window to:*

* create a new Google profile (no Google sign-in)
* log in to all required sites (e.g. Moneycontrol, TradingView)
* install your preferred adblocker
* then close the window to save the profile.

---

## 7️⃣ Authenticate with Google API

* Run:

```bash
node test-google.js
```

✅ *This will prompt you to sign in with your Google account, grant permissions, and paste back the code. This generates your `token.json`.*

---

## 8️⃣ Prepare Google API Credentials

* Go to [Google Cloud Console](https://console.cloud.google.com/)

  * Enable **Google Drive API** and **Google Docs API**
  * Download the OAuth credentials JSON
  * Rename it to:

```
oauth2_credentials.json
```

* Place it in your project folder.

---

## 9️⃣ Create Screenshot Storage

✅ *Manually create a folder to store your screenshots, for example:*

```
stock-screenshot-agent/screenshots
```

---

## 1️⃣0️⃣ Ready to Go!

🎉 Your stock-screenshot-agent is now set up.

* Start your server:

```bash
node index.js
```

---

## 1️⃣1️⃣ Strting everyday!

To start it everyday, simply open the nodejs command prompt and run this command:

```bash
cd ..
cd Hiren Thakker
cd stock-screenshot-agent
node index.js
```

To forward it using an ngrok link, simply open windows powershell, and run this command:

```bash
ngrok http --url="" 3000
```

---

## 🛠️ What It Does

✅ Automates capturing stock charts from Moneycontrol and TradingView
✅ Downloads stock reports in PDF
✅ Assembles everything in a clean Google Document
✅ Uploads results to Google Drive
✅ Cleans up automatically after completion

---

## 💡 Tips

* If you want to add more TradingView accounts, create additional profiles with Playwright persistent storage.
* Keep your `token.json` safe; it holds your Google API authorization.
* You can customize the agent to capture different sites with minimal changes.

---
**Happy automating!** 😁
---

