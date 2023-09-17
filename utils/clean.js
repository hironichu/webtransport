if (import.meta.main) {
	try {
	  Deno.statSync("./dist");
	  const rule = /^(.*)\.so$|^(.*)\.dll$|^(.*)\.dylib$/;
	  const files = Deno.readDirSync("./dist");
	  for (const file of files) {
		if (!rule.test(file.name)) {
		  Deno.removeSync("./dist/" + file.name);
		}
	  }
	  console.info(`Cleaned up ./dist`);
	} catch {
	  console.error(`Count not find ./dist`);
	}
  }