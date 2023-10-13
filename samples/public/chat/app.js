import { callAPI } from '../gpt.js';

const completeChat = [];

document.addEventListener('DOMContentLoaded', () => {
	document.querySelector('#chatbox').addEventListener('submit', e => {
		e.preventDefault();

		const prompt = document.querySelector('#prompt').value;
		if (prompt) {
			document.querySelector('#prompt').value = '';
			// sendChat(prompt);
			sendChatApi(prompt);
		}
	});
});

async function sendChat(prompt) {
	const messages = [
		{
			role: 'user',
			content: prompt
		}
	];
	completeChat.push(...messages);

	const ul = document.querySelector('ul');
	ul.innerHTML += `<li><b>${prompt}</b></li>`;
	const li = `<li data-id="prompt-output-${completeChat.length}"></li>`;
	ul.innerHTML += li;
	try {
		const response = await callAPI('https://api.openai.com/v1/chat/completions', {
			model: 'gpt-3.5-turbo',
			messages: completeChat,
			max_tokens: 200,
			temperature: 0,
			stream: true
		});
		const reader = response.body.getReader();

		let result;
		let decoder = new TextDecoder('utf8');

		while (true) {
			result = await reader.read();
			if (result?.done) {
				document.querySelector('input').focus();
				break;
			}
			let chunk = decoder.decode(result.value);
			chunk.split('\n').forEach(completion => {
				try {
					const validObj = completion.replace('data:', '');
					console.log(validObj);
					if (validObj) {
						const { choices } = JSON.parse(validObj);
						const { role, content } = choices[0].delta;
						if (!role && content) {
							document.querySelector(`[data-id="prompt-output-${completeChat.length}"]`).innerText +=
								content;
						}
					}
				} catch (error) {
					console.error(`Error parsing JSON: ${error}`);
					return null; // Handle the error as needed
				}
			});
		}
	} catch (e) {
		console.log('Error:', e);
	}
}

const setListener = () => {
	// for same domain
	const eventSource = new EventSource('/api/chat');

	// for different domain
	// const eventSource = new EventSource("http://localhost:8000/api/chat", { withCredentials: true });

	eventSource.addEventListener('message', event => {
		const data = JSON.parse(event.data);

		const ele = document.querySelector(`[data-id="prompt-output-${completeChat.length}"]`);

		if (data.content === undefined) {
			eventSource.close();
			completeChat.push({ role: 'assistant', content: ele.innerText });
			document.querySelector('input').focus();
		} else {
			document.querySelector(`[data-id="prompt-output-${completeChat.length}"]`).innerText +=
				data.content;
		}
	});
};

async function sendChatApi(prompt) {
	setListener();

	const ul = document.querySelector('ul');
	ul.innerHTML += `<li><b>${prompt}</b></li>`;
	const li = `<li data-id="prompt-output-${completeChat.length}"></li>`;
	ul.innerHTML += li;
	try {
		const response = await fetch('/api/chat', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify([
				...completeChat,
				{
					role: 'user',
					content: prompt
				}
			])
		});
		// const output = await response.json();
		// document.querySelector(`[data-id="prompt-output-${completeChat.length}"]`).innerText +=
		// 	output.data.message.content;
		// document.querySelector('input').focus();
	} catch (e) {
		console.log('Error:', e);
	}
}
