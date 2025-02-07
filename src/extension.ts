// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import ollama from 'ollama';

export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "bropilot" is now active!');

	const disposable = vscode.commands.registerCommand('bropilot.start', () => {
		const panel = vscode.window.createWebviewPanel(
			'bropilot',
			'BroPilot',
			vscode.ViewColumn.One,
			{
				enableScripts: true
			}
		);

		panel.webview.html = getWebviewContent();

		panel.webview.onDidReceiveMessage(async (message: any) => {
			if (message.command === 'submit') {
				const prompt = message.prompt;
				let resText = '';

				try {
					const streamRes = await ollama.chat({
						model: 'deepseek-r1:70b',
						messages: [{ role: 'user', content: prompt }],
						stream: true
					});

					for await (const res of streamRes) {
						resText += res.message.content;
						panel.webview.postMessage({ command: 'chatResponse', text: resText });
					}
				} catch (error: any) {
					panel.webview.postMessage({ command: 'chatResponse', text: `Error: ${error.message}` });
				}
			}
		});
	});

	context.subscriptions.push(disposable);
}

function getWebviewContent(): string {
	return /*html*/ `
	<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>BroPilot</title>
		<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github-dark.min.css">
		<style>
			body {
				font-family: -apple-system, BlinkMacSystemFont, 'Segoe WPC', 'Segoe UI', system-ui, 'Ubuntu', 'Droid Sans', sans-serif;
				padding: 20px;
				background-color: var(--vscode-editor-background);
				color: var(--vscode-editor-foreground);
			}
			.container {
				max-width: 800px;
				margin: 0 auto;
			}
			h1 {
				color: var(--vscode-button-foreground);
				border-bottom: 1px solid var(--vscode-button-border);
				padding-bottom: 0.5em;
			}
			.prompt-container {
				margin: 20px 0;
				display: flex;
				flex-direction: column;
				gap: 10px;
			}
			#prompt {
				width: 100%;
				height: 150px;
				padding: 10px;
				border: 1px solid var(--vscode-input-border);
				background-color: var(--vscode-input-background);
				color: var(--vscode-input-foreground);
				resize: vertical;
				font-family: var(--vscode-font-family);
			}
			#submit {
				align-self: flex-start;
				padding: 8px 16px;
				background-color: var(--vscode-button-background);
				color: var(--vscode-button-foreground);
				border: 1px solid var(--vscode-button-border);
				cursor: pointer;
				transition: background-color 0.2s;
			}
			#submit:hover {
				background-color: var(--vscode-button-hoverBackground);
			}
			#response {
				white-space: pre-wrap;
				margin-top: 20px;
				padding: 15px;
				background-color: var(--vscode-notifications-background);
				border: 1px solid var(--vscode-notifications-border);
				border-radius: 3px;
				min-height: 200px;
				max-height: 60vh;
				overflow-y: auto;
				font-family: var(--vscode-editor-font-family);
				font-size: var(--vscode-editor-font-size);
			}
			.description {
				margin-bottom: 20px;
				color: var(--vscode-descriptionForeground);
				line-height: 1.5;
			}
		</style>
		<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
		<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
		<script>
			marked.setOptions({
				highlight: function(code, lang) {
					if (lang && hljs.getLanguage(lang)) {
						return hljs.highlight(code, { language: lang }).value;
					} else {
						return hljs.highlightAuto(code).value;
					}
				},
				langPrefix: 'hljs language-'
			});
		</script>
	</head>
	<body>
		<div class="container">
			<h1>BroPilot</h1>
			<p class="description">
				BroPilot helps you write better code by providing you with code snippets, examples, and templates.
			</p>
			
			<div class="prompt-container">
				<textarea 
					id="prompt" 
					placeholder="Enter your coding question or prompt here..."
					spellcheck="false"
				></textarea>
				<button id="submit">Generate Code</button>
			</div>

			<div id="response"></div>
		</div>

		<script>
			const vscode = acquireVsCodeApi();
			const responseDiv = document.getElementById('response');
			const submitButton = document.getElementById('submit');

			document.getElementById('submit').addEventListener('click', () => {
				const prompt = document.getElementById('prompt').value;
				if (!prompt.trim()) return;
				
				submitButton.disabled = true;
				submitButton.textContent = 'Generating...';
				responseDiv.innerHTML = '';

				vscode.postMessage({
					command: 'submit',
					prompt: prompt
				});
			});

			window.addEventListener('message', event => {
				const { command, text } = event.data;
				if (command === 'chatResponse') {
					responseDiv.innerHTML = marked.parse(text);
					hljs.highlightAll();
					submitButton.disabled = false;
					submitButton.textContent = 'Generate Code';
					responseDiv.scrollTop = responseDiv.scrollHeight;
				}
			});
		</script>
	</body>
	</html>`;
}

export function deactivate() { }
