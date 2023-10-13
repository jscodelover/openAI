const setListener = () => {
	const eventSource = new EventSource('/api/chat');

	eventSource.addEventListener('message', event => {
		const data = JSON.parse(event.data);
		if (data.content === undefined) {
			eventSource.close();
		} else {
			document.querySelector('output').innerText += data.content;
		}
	});
};

async function send() {
	setListener();

	document.querySelector('output').innerText = '';
	const prompt = document.querySelector('#prompt').value;

	const response = await fetch('/api/general', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ prompt })
	});
	const output = await response.json();
	console.log(output);
}
