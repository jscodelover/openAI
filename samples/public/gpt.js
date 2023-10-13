const OPENAI_KEY = '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';

export async function callAPI(endpoint, data) {
	const response = await fetch(endpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${OPENAI_KEY}`
		},
		body: JSON.stringify(data)
	});

	return response;
}
