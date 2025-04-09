const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");
const {
	GoogleGenerativeAI,
	HarmCategory,
	HarmBlockThreshold,
} = require("@google/generative-ai");
const fs = require("node:fs");
require("dotenv").config();

const { OpenAI } = require("openai");

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY,
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
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-dev-shm-usage", // Prevents crashes from /dev/shm issues
			"--disable-gpu", // Disables GPU acceleration
			"--single-process", // Runs everything in one process (reduces RAM usage)
			"--no-zygote", // Prevents multiple processes from spawning
		],
	},
});

client.on("framenavigated", () => {
	console.log("navigated away");
});

client.on("ready", () => {
	console.log("Client is ready!");
});

// this runs once to connect to the whatsapp web headless browser
client.on("qr", (qr) => {
	qrcode.generate(qr, { small: true });
});

client.on("message_create", async (message) => {
	// console.log(message.id.remote);
	if (message.id.remote === ids.investingGroup || message.fromMe) {
		if (message.body.startsWith("!חיפוש")) {
			let msgParts = message.body.split(" ", 2);
			console.log(msgParts[1]);
			let analysis = await checkInvestmentGPT(msgParts[1]);
			message.reply(analysis);
		}
		if (message.body.startsWith("!דיל")) {
			let msgParts = message.body.split(" ", 2);
			console.log(msgParts[1]);
			let deal = await getDealFromAliexpress(msgParts[1]);
			message.reply(deal);
		}
	}
});
client.initialize();

const checkInvestmentGPT = async (stock) => {
	console.log("request analysis");
	const response = await openai.chat.completions.create({
		model: gptSettings.model,
		messages: [
			{
				role: "system",
				content: [
					{
						type: "text",
						text: prompts.system,
					},
				],
			},
			{
				role: "user",
				content: [
					{
						type: "text",
						text: stock,
					},
				],
			},
		],
		response_format: gptSettings.response_format,
		temperature: gptSettings.temperature,
		max_completion_tokens: gptSettings.max_completion_tokens,
		top_p: gptSettings.top_p,
		frequency_penalty: gptSettings.frequency_penalty,
		presence_penalty: gptSettings.presence_penalty,
		store: true,
	});
	console.log("analysis received");
	const content = JSON.parse(response.choices[0].message.content);
	console.log(content);
	return buildMessage(content);
};

// the response from the API must return one of those, this is just to translate the output
const recommendationTranslation = {
	buy: "קנייה",
	sell: "מכירה",
	short: "שורט",
};

const buildMessage = (content) => {
	let message = `*מנייה:* ${content.stock_name}\n
                    *סיכום:* ${content.analysis.summary}\n
                    *יתרונות:*\n
                    ${content.analysis.pros
						.map((pro, index) => {
							return `${index + 1}.${pro}\n`;
						})
						.join("")}
                    *חסרונות:*\n
                    ${content.analysis.cons
						.map((con, index) => {
							return `${index + 1}.${con}\n`;
						})
						.join("")}
                    *החלטה:* ${
						recommendationTranslation[
							content.analysis.recommendation
						]
					}`;
	return message;
};

const getDealFromAliexpress = async (search) => {
	const url = "https://free-aliexpress-api.p.rapidapi.com/hot_products?";
	const searchParams = new URLSearchParams({
		cat_id: 7,
		sort: "LAST_VOLUME_DESC",
		target_currency: "ILS",
		target_language: "HE",
		page: 1,
	});

	//*~ currently unused
	// if (search.length > 0) { // if search is added to command
	//      searchParams.append("keywords", search);
	// }

	console.log(url + searchParams);

	try {
		const response = await fetch(url + searchParams, {
			method: "GET",
			headers: {
				"x-rapidapi-key": process.env.RAPIDAPI_KEY,
				"x-rapidapi-host": "free-aliexpress-api.p.rapidapi.com",
			},
		});
		let result = await response.json();
        console.log(result);
		result = result.filter((deal) => {
			return Number(deal.discount.slice(0,-1)) > 0;
		}); // filter out deals with no discount
		const deal = result[Math.floor(Math.random() * result.length)];
		return dealMessage(deal);
		// console.log(result);
	} catch (error) {
		console.error(error);
	}
};

const dealMessage = (deal) => {
	let message = `*מוצר:* ${deal.product_title}\n
                    *מחיר מקורי:* ${deal.target_original_price} ש"ח\n
                    *מחיר הנחה:* ${deal.target_sale_price} ש"ח\n
                    *הנחה:* ${deal.discount} %\n
                    *קישור:* ${deal.product_detail_url}\n
                    *תמונה:* ${deal.product_image}`;
	return message;
};

/!* old gemini call - deprecated - moved to GPT */;
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
