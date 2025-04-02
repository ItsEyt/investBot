# InvestBot for whatsapp
this is a simple bot using whatsapp-web.js library and Gemini API to analyze stock market and recommend the group chat

## how to use
1. clone the repo
2. add `.env` file with your `GEMINI_API_KEY` listed there
3. add a `ids.json` file with the following structure:

        {
            "investingGroup": `your group id`
        }

> to find the group id, look in the [find your group id section](#Find-your-group-id)

4. edit `geminiPrompts.json` and `geminiTweak.json` to fit your needs
5. install all dependecies using `npm install`
6. run `node start` to run the program for the first time
7. as a first time run, after a few seconds, a QR code should appear in the terminal
8. in your designated whatsapp, go to <img src="https://www.svgrepo.com/show/345223/three-dots-vertical.svg" height=15/> on your whatsapp and choose *Linked devices* → *Link a device* and scan the QR code
9. you should see a message *Client is ready!*
10. the program should work! test it using the keyword `!חיפוש` followed by a stock symbol


## Find your group id
for this you will have to do some digging
1. uncomment the `console.log` inside the `message_create` listener
2. send a message in the chat *make sure no other messages are being sent at the same time*
3. copy the id printed in the terminal