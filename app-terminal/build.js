const esbuild = require('esbuild');
const fs = require('fs');
const { sassPlugin } = require('esbuild-sass-plugin');

const onRebuild = {
	name: 'onRebuild',
	setup(build) {
		build.onEnd(result => {
			console.log('watch/build succeeded:', result);
			fs.cpSync("./src/index.html","./target/index.html");
			fs.cpSync("./src/img","./target/img",{ recursive: true });
			fs.cpSync("./target","../target/classes/app-terminal",{ recursive: true });
		});
	},
};

(async function() {
	const ctx = await esbuild.context({
		entryPoints: [ './src/index.jsx'/*, './src/index.scss'*/ ],
		entryNames: 'index',
		plugins: [
			sassPlugin(),
			onRebuild,
		],
		loader: { '.jpg': 'file', '.png': 'file' },
		platform: "browser",
		bundle: true,
		minify: false,
		sourcemap: true,
		outdir: "./target",
	})
	await ctx.watch();
	await ctx.rebuild();
})();

function sleep() { setTimeout(sleep,1000); }
sleep();
