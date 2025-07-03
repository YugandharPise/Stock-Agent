# Stock Screenshot Agent Setup Guide

## Fresh Setup (After Laptop Reset or Format)

1. Go to `C:/Users/<your username>` and create a folder named `stock-screenshot-agent`.
2. Download the git repo from:
   [https://github.com/YugandharPise/Stock-Agent.git](https://github.com/YugandharPise/Stock-Agent.git)
3. Copy the downloaded files into `stock-screenshot-agent`.
4. Install Node.js from its official website and set it up.
5. Install ngrok from its official website and set it up.
6. In the Node.js terminal, run:

   ```bash
   npm init -y
   npm install express playwright googleapis multer uuid dayjs express-fileupload axios
   npx playwright install
   ```
7. Inside the project folder, run:

   ```bash
   node login.js
   ```

   *Login to Moneycontrol and the first TradingView account.*
8. Then run:

   ```bash
   node login2.js
   ```

   *Login to the second TradingView account.*
9. In the Node.js terminal, navigate to your project folder:

   ```bash
   cd C:/Users/<your username>/stock-screenshot-agent
   ```
10. Start the bot server:

    ```bash
    node index.js
    ```

    *You should see a message that the bot started at localhost:3000.*
11. Open a Windows PowerShell terminal and run:

    ```bash
    ngrok http --url=<your ngrok url> 3000
    ```
12. Go to the ngrok forwarding link in your browser to start automating!

## Daily Bot Start

Every day, repeat steps 9 through 12.
