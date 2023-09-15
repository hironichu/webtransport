
Deno.serve((_) => {
	return new Response(Deno.readTextFileSync('./examples/index.html'), {
		headers: {
			'content-type': 'text/html'
		}
	});
})