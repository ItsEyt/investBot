const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, } = require("@google/generative-ai");
const fs = require('node:fs');
require('dotenv').config();

const { OpenAI } = require("openai");

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});


const ids = JSON.parse(fs.readFileSync("ids.json"));
// const prompts = JSON.parse(fs.readFileSync("geminiPrompts.json"));
// const geminiSettings = JSON.parse(fs.readFileSync("geminiTweak.json"));

const prompts = JSON.parse(fs.readFileSync("gptPrompts.json"));
const gptSettings = JSON.parse(fs.readFileSync("gptTweak.json"));

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-features=site-per-process',
            '--window-size=1920,1080'
        ]
    }
});

client.on('ready', () => {
    console.log('Client is ready!');
});

// this runs once to connect to the whatsapp web headless browser
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('message_create', async message => {
    // console.log(message.id.remote);
    if (message.id.remote === ids.investingGroup || message.fromMe) {
        if (message.body.startsWith('!חיפוש')) {
            let msgParts = message.body.split(' ', 2);
            console.log(msgParts[1])
            let analysis = await checkInvestmentGPT(msgParts[1]);
            message.reply(analysis);
        }
    }
})
client.initialize();


const checkInvestmentGPT = async (stock) => {

    const response = await openai.chat.completions.create({
        model: gptSettings.model,
        messages: [
            {
                "role": "system",
                "content": [
                    {
                        "type": "text",
                        "text": prompts.system
                    }
                ]
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": stock
                    }
                ]
            }
        ],
        response_format: gptSettings.response_format,
        temperature: gptSettings.temperature,
        max_completion_tokens: gptSettings.max_completion_tokens,
        top_p: gptSettings.top_p,
        frequency_penalty: gptSettings.frequency_penalty,
        presence_penalty: gptSettings.presence_penalty,
        store: true
    });

    // console.log(response.choices[0]);
    const content = JSON.parse(response.choices[0].message.content);

    return buildMessage(content);


}

// the response from the API must return one of those, this is just to translate the output
const recommendationTranslation = {
    buy: "קנייה",
    sell: "מכירה",
    short: "שורט"
}

const buildMessage = (content) => {
    let message = `*מנייה:* ${content.stock_name}\n
                    *סיכום:* ${content.analysis.summary}\n
                    *יתרונות:*\n
                    ${content.analysis.pros.map((pro, index) => { return `${index + 1}.${pro}\n` }).join('')}
                    *חסרונות:*\n
                    ${content.analysis.cons.map((con, index) => { return `${index + 1}.${con}\n` }).join('')}
                    *החלטה:* ${recommendationTranslation[content.analysis.recommendation]}`
    return message;
}



/!* old gemini call - deprecated - moved to GPT */
// const checkInvestment = async (stock) => {
//     const apiKey = process.env.GEMINI_API_KEY;
//     const genAI = new GoogleGenerativeAI(apiKey);

//     const model = genAI.getGenerativeModel({
//         model: geminiSettings.model,
//         systemInstruction: prompts.system,
//     });

//     const generationConfig = {
//         temperature: geminiSettings.temperature,
//         topP: geminiSettings.topP,
//         topK: geminiSettings.topK,
//         maxOutputTokens: geminiSettings.maxOutputTokens,
//         responseModalities: [
//         ],
//         responseMimeType: "application/json",
//         responseSchema: geminiSettings.responseSchema,
//     };

//     async function run() {
//         const chatSession = model.startChat({
//             generationConfig,
//             history: [
//             ],
//         });
//         const result = await chatSession.sendMessage(prompts.user + stock);
//         console.log("finished call");
//         return JSON.parse(result.response.text());
//     }

//     return await run();
// }
