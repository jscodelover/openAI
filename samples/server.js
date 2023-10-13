const OPENAI_KEY = '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';

const OpenAIApi = require('openai');

const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();

app.use(express.json()); // parse JSON requests
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const openai = new OpenAIApi({
	apiKey: OPENAI_KEY
});

let clients = [];

const notifySubscribers = message => {
	// Send a message to each subscriber
	clients.forEach(client => client.res.write(`data: ${JSON.stringify(message)}\n\n`));
};

app.get('/api/chat', (req, res) => {
	// Set necessary headers to establish a stream of events
	const headers = {
		'Content-Type': 'text/event-stream',
		Connection: 'keep-alive'
	};
	res.writeHead(200, headers);

	// Add a new client that just connected
	// Store the id and the whole response object
	const id = Date.now();
	const client = {
		id,
		res
	};
	clients.push(client);

	console.log(`Client connected: ${id}`);

	// When the connection is closed, remove the client from the subscribers
	req.on('close', () => {
		console.log(`Client disconnected: ${id}`);
		clients = clients.filter(client => client.id !== id);
	});
});

app.post('/api/chat', async (req, res) => {
	try {
		const stream = await openai.chat.completions.create({
			messages: [
				{
					role: 'system',
					content: 'You are a helpful assistant.'
				},
				...req.body
			],
			model: 'gpt-3.5-turbo',
			temperature: 0,
			max_tokens: 100,
			stream: true
		});

		let i = 0;
		for await (const part of stream) {
			console.log(i++, part.choices[0]?.delta?.content);
			notifySubscribers(part.choices[0]?.delta || '');
		}
		res.json({ data: 'done' });

		// const { id, usage, choices } = completion;
		// res.json({
		// 	id,
		// 	usage,
		// 	data: {
		// 		message: choices[0].message,
		// 		finish_reason: choices[0].finish_reason
		// 	}
		// });
	} catch (e) {
		res.json('Something went wrong', e);
	}
});

app.post('/api/general', async (req, res) => {
	try {
		const stream = await openai.chat.completions.create({
			messages: [
				{
					role: 'system',
					content: 'You are a helpful assistant.'
				},
				{
					role: 'user',
					content: req.body.prompt
				}
			],
			model: 'gpt-3.5-turbo',
			temperature: 0,
			stream: true
		});
		for await (const part of stream) {
			notifySubscribers(part.choices[0]?.delta || '');
		}
		res.json({ data: 'done' });
	} catch (e) {
		res.json('Something went wrong', e);
	}
});

app.post('/api/image', async (req, res) => {
	const { prompt } = req.body;
	try {
		const image = await openai.images.generate({
			prompt,
			size: '512x512',
			user: 'a person who cook'
		});
		res.json(image.data[0]);
	} catch (e) {
		console.log('Something went error: ', e);
	}
});

app.post('/api/recipe', async (req, res) => {
	const { ingredients } = req.body;

	const result = await openai.chat.completions.create({
		messages: [
			{
				role: 'system',
				content: "You're a Professional Chef"
			},
			{
				role: 'user',
				content: `
				I'm sharing a ingredients I have with me in this """. And consider that I have basic 
				ingredients like: salt, black pepper, white pepper, chilly, tumeric, oil. I want you to 
				share a recipe that I can create using the ingredients that I shared in """.
				"""${ingredients}""".

				And if the ingredients mention inside the """ are empty then return only a false with no extra. 

				or if you found the recipe. Then	I'm sharing a sample mention inside +++ that you have to use to share the recipe details. 
				And I don't want any other content in the reply other then the mention format inside the +++ and reply should be a valid JSON. 

				+++
				{
					"slug": "fish-tacos",
					"name": "Fish Tacos with Pickled Onion",
					"type": "Main Meal",
					"duration": 60,
					"image": "images/original/fish-tacos-with-pickled-onion.png",
					"description": "Delicious fish tacos made with crispy breaded fish, fresh cilantro, and tangy pickled onions wrapped in a soft flour tortilla.",
					"ingredients": {
						"Red onion": "1",
						"Water": "1 cup",
						"Vinegar": "1 cup",
						"Sugar": "1 tablespoon",
						"Salt": "1 teaspoon",
						"Lime": "1"
					},
					"steps": [
						{
							"name": "Pickle Onions",
							"description": "Thinly slice the red onion and set aside."
						},
						{
							"name": "Prepare Pickling Liquid",
							"description": "In a small saucepan, combine the water, vinegar, sugar, and salt. Bring to a simmer, then remove from heat.",
							"timer": 5
						},
						{
							"name": "Pickle Onions",
							"description": "Add the sliced onions to the pickling liquid and let sit for at least 30 minutes.",
							"timer": 30
						}
					]
				},
				+++
				`
			}
		],
		model: 'gpt-3.5-turbo',
		temperature: 0
	});

	res.json(result);
});

app.listen(3000, () => {
	console.log('Server started on port 3000');
});
