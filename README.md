# Stock-Agent
Git repository for stock agent.

Steps to build the agent from scratch in case of system reset or damage.
Steps to setup stock-screenshot-agent:

1. Install node.js latest

In the node.js cmd, run the following commands step by step:

2. mkdir stock-screenshot-agent
   cd stock-screenshot-agent
   
To create a new folder for the bot.

4. npm init -y
Output: package.json should appear in the folder
Initialize the directory as a bot.

6. npm install express playwright googleapis multer uuid dayjs express-fileupload axios

Output: There should be another folder in the dir named "node_modules".

5. npx playright install

6. In parent folder:
Run: node login.js
Create a new profile in google without signing in.
Login on all sites. Install adblocker. Close window once done.

8. Run test-google.js
Login using the same google account, give both permissions, then copy the code in the url and paste in the terminal. This will create token.json.

10. Create folder for storing all the screenshots.
