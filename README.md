🚀 Stock Screenshot Agent
⚡ Automate your stock research with instant screenshots, Google Docs reports, and a clean user interface — all in one click!

🛠️ Full Setup (if laptop resets or is formatted)
Follow these steps from scratch:

1️⃣ Create project folder
📁 Go to

makefile
Copy
Edit
C:\Users\<your-username>
and create:

Copy
Edit
stock-screenshot-agent
2️⃣ Download code
⬇️ Grab the repo:
https://github.com/YugandharPise/Stock-Agent.git

Copy all files to stock-screenshot-agent.

3️⃣ Install Node.js
🔗 Download and install from nodejs.org

4️⃣ Install ngrok
🌐 Download and install from ngrok.com

5️⃣ Install dependencies
💻 In a Node.js terminal, run:

bash
Copy
Edit
npm init -y
npm install express playwright googleapis multer uuid dayjs express-fileupload axios
npx playwright install
6️⃣ Login to accounts
🔐 In the project folder:

bash
Copy
Edit
node login.js
➡️ Log in to Moneycontrol and the first TradingView account.

7️⃣ Login to second TradingView

bash
Copy
Edit
node login2.js
➡️ Log in to the second TradingView account.

8️⃣ Navigate to project folder
📂 From the Windows menu, open Node.js terminal and type:

bash
Copy
Edit
cd C:\Users\<your-username>\stock-screenshot-agent
9️⃣ Start the bot
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
🔟 Expose bot to the world
🌍 In a separate Windows PowerShell window, run:

bash
Copy
Edit
ngrok http --url=<your-ngrok-url> 3000
🟢 This creates a public forwarding link.

1️⃣1️⃣ Launch the UI
🖥️ Visit your ngrok forwarding link in your browser
🎉 Happy automating!

🕒 Daily Usage
To start the bot each day:

🔄 Repeat steps 8 through 11 above.

⚡ Notes
If you format or reset the laptop, start from the Full Setup section.

If you just want to run it daily, follow the “Daily Usage” section.
