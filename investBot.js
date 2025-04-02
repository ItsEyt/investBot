const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, } = require("@google/generative-ai");
const fs = require('node:fs');
require('dotenv').config();

const ids = JSON.parse(fs.readFileSync("ids.json"));
const prompts = JSON.parse(fs.readFileSync("geminiPrompts.json"));
const geminiSettings = JSON.parse(fs.readFileSync("geminiTweak.json"));

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('ready', () => {
    console.log('Client is ready!');
});

// this runs once to connect to the whatsapp web headless browser
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('message_create', message => {
    console.log("message located! " + message.body);
    console.log("from: " + message.from);
    if (message.from === ids.investingGroup) {
        console.log("from investing group!");
        if (message.body.startsWith('!חיפוש')) {
            console.log("searching stock")
            let msgParts = message.body.split(' ', 2);
            console.log(msgParts[1])
            let analysis = checkInvestment(msgParts[1]);
            message.reply(`*מנייה*: ${analysis.stock_name}\n ${analysis.data}`)
        }
    }
})
client.initialize();


const checkInvestment = (stock) => {
    console.log("stock: " + stock);
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
        model: geminiSettings.model,
        systemInstruction: prompts.system,
    });

    const generationConfig = {
        temperature: geminiSettings.temperature,
        topP: geminiSettings.topP,
        topK: geminiSettings.topK,
        maxOutputTokens: geminiSettings.maxOutputTokens,
        responseModalities: [
        ],
        responseMimeType: "application/json",
        responseSchema: geminiSettings.responseSchema,
    };

    async function run() {
        const chatSession = model.startChat({
            generationConfig,
            history: [
            ],
        });
        console.log(prompts.user + stock)
        const result = await chatSession.sendMessage(prompts.user + stock);
        console.log("finished call");
        return JSON.parse(result.response.text());
    }

    return run();
}

// checkInvestment("NVDA");