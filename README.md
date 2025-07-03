📈 Stock Screenshot Agent
An advanced automation agent for capturing stock screenshots, generating stock reports, and uploading them to Google Drive & Docs — fully automated and effortless.

🚀 Full Setup (Fresh Install / System Format)
If your laptop is reset or formatted, follow these clear steps to rebuild from scratch:

1️⃣ Install Prerequisites
✅ Install Node.js (latest LTS)
👉 Download Node.js

✅ Install ngrok
👉 Download ngrok

2️⃣ Create Project Directory
bash
Copy
Edit
cd C:\Users\<your-username>
mkdir stock-screenshot-agent
✅ This will hold all your project files.

3️⃣ Download Source Files
⬇️ Clone or download this repository:
https://github.com/YugandharPise/Stock-Agent.git

✅ Place all downloaded files into the stock-screenshot-agent folder you just created.

4️⃣ Install Project Dependencies
bash
Copy
Edit
npm init -y
npm install express playwright googleapis multer uuid dayjs express-fileupload axios
npx playwright install
✅ This sets up everything the agent needs.

5️⃣ Login to Required Accounts
👉 In the project folder, run:

bash
Copy
Edit
node login.js
✅ Use this to log in to Moneycontrol and your first TradingView account.

6️⃣ Login to Second TradingView
👉 Next, run:

bash
Copy
Edit
node login2.js
✅ Use this to log in to your second TradingView account.

7️⃣ Navigate to Project Folder
📂 In your Node.js terminal, change to your project directory:

bash
Copy
Edit
cd C:\Users\<your-username>\stock-screenshot-agent
8️⃣ Start the Bot
⚙️ Run:

bash
Copy
Edit
node index.js
✅ You should see:

arduino
Copy
Edit
Server running at http://localhost:3000
9️⃣ Expose to the Internet with ngrok
🌍 In a separate PowerShell window, run:

bash
Copy
Edit
ngrok http --url=<your-ngrok-authenticated-url> 3000
✅ This forwards your localhost server to a public link.

🔟 Launch the UI
🖥️ Visit the ngrok forwarding link in your browser
🎉 You’re ready to automate!

🕒 Daily Usage
Each day, simply repeat these steps:

1️⃣ Open Node.js terminal:

bash
Copy
Edit
cd C:\Users\<your-username>\stock-screenshot-agent
node index.js
2️⃣ Open PowerShell for ngrok:

bash
Copy
Edit
ngrok http --url=<your-ngrok-authenticated-url> 3000
✅ Then go to your ngrok link and start working.

🛠️ What This Bot Does
✅ Captures high-quality screenshots from Moneycontrol & TradingView
✅ Downloads and attaches stock reports (PDF)
✅ Compiles everything into a clean Google Doc
✅ Uploads to Google Drive automatically
✅ Cleans up temporary files
✅ Streams real-time status updates to the user interface

💡 Tips & Best Practices
✨ Keep your token.json safe — it contains your Google API authorization.
✨ For a second TradingView account, always run login2.js if you ever clear browser data.
✨ Feel free to extend the agent to capture other stock sites with minimal changes.
✨ Always test your ngrok link before sharing with others.

Happy Automating! 😄🚀

