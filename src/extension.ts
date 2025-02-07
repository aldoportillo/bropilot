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

		let conversation: Array<{ role: 'user' | 'assistant'; content: string }> = [];

		panel.webview.onDidReceiveMessage(async (message: any) => {
			if (message.command === 'submit') {
				const prompt = message.prompt;
				conversation.push({ role: 'user', content: prompt });

				panel.webview.postMessage({ command: 'updateChat', messages: conversation });

				let currentAssistantIndex: number | null = null;
				let streamResText = '';

				try {
					const streamRes = await ollama.chat({
						model: 'deepseek-r1:70b',
						messages: [{ role: 'user', content: prompt }],
						stream: true
					});

					for await (const chunk of streamRes) {
						if (currentAssistantIndex === null) {
							conversation.push({ role: 'assistant', content: '' });
							currentAssistantIndex = conversation.length - 1;
						}
						streamResText += chunk.message.content;
						conversation[currentAssistantIndex].content = streamResText;

						panel.webview.postMessage({
							command: 'updateChat',
							messages: conversation
						});
					}
				} catch (error: any) {
					conversation.push({
						role: 'assistant',
						content: `Error: ${error.message}`
					});
					panel.webview.postMessage({
						command: 'updateChat',
						messages: conversation
					});
				} finally {
					panel.webview.postMessage({ command: 'done' });
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
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>BroPilot</title>

		<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github-dark.min.css" />

		<style>
			html, body {
				height: 100%;
				padding: 0;
				margin: 0;
			}
			body {
				display: flex;
				flex-direction: column;
				font-family: -apple-system, BlinkMacSystemFont, 'Segoe WPC', 'Segoe UI', system-ui, 'Ubuntu', 'Droid Sans', sans-serif;
				background-color: var(--vscode-editor-background);
				color: var(--vscode-editor-foreground);
			}
			.header {
				background-color: var(--vscode-button-background);
				color: var(--vscode-button-foreground);
				padding: 0.75rem 1rem;
				border-bottom: 1px solid var(--vscode-button-border);
			}
			.header h1 {
				margin: 0;
				font-size: 1.25rem;
			}
			.chat-container {
				flex: 1;
				overflow-y: auto;
				padding: 1rem;
			}
			.input-container {
				display: flex;
				gap: 0.5rem;
				padding: 0.75rem;
				border-top: 1px solid var(--vscode-button-border);
				background-color: var(--vscode-editor-background);
			}
			#prompt {
				flex: 1;
				resize: none;
				height: 60px;
				padding: 0.5rem;
				border: 1px solid var(--vscode-input-border);
				background-color: var(--vscode-input-background);
				color: var(--vscode-input-foreground);
				font-family: var(--vscode-editor-font-family);
			}
			#submit {
				padding: 0.5rem 1rem;
				background-color: var(--vscode-button-background);
				color: var(--vscode-button-foreground);
				border: 1px solid var(--vscode-button-border);
				cursor: pointer;
				transition: background-color 0.2s;
			}
			#submit:hover {
				background-color: var(--vscode-button-hoverBackground);
			}
			.message-row {
				display: flex;
				margin-bottom: 1rem;
			}
			.message {
				padding: 0.75rem;
				border-radius: 8px;
				white-space: pre-wrap;
				word-wrap: break-word;
				max-width: 80%;
			}
			.user-message {
				align-self: flex-end;
				background-color: var(--vscode-editorSelectionBackground);
				margin-left: auto;
			}
			.assistant-message {
				align-self: flex-start;
				background-color: var(--vscode-notificationsBackground);
				margin-right: auto;
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

			const vscode = acquireVsCodeApi();

			let messages = [];

			function renderMessages() {
				const chatContainer = document.getElementById('chat-container');
				chatContainer.innerHTML = '';

				messages.forEach(msg => {
					const row = document.createElement('div');
					row.className = 'message-row';

					const bubble = document.createElement('div');
					bubble.classList.add('message');

					if (msg.role === 'user') {
						bubble.classList.add('user-message');
						bubble.innerHTML = marked.parse(msg.content);
						hljs.highlightAll();
					} else {
						bubble.classList.add('assistant-message');
						bubble.innerHTML = marked.parse(msg.content);
						hljs.highlightAll();
					}

					row.appendChild(bubble);
					chatContainer.appendChild(row);
				});

				chatContainer.scrollTop = chatContainer.scrollHeight;
			}

			function handleSend() {
				const promptField = document.getElementById('prompt');
				const submitButton = document.getElementById('submit');
				const prompt = promptField.value.trim();
				if (!prompt) return;

				submitButton.disabled = true;
				submitButton.textContent = 'Generating...';
				vscode.postMessage({
					command: 'submit',
					prompt: prompt
				});
				promptField.value = '';
			}

			window.addEventListener('message', event => {
				const data = event.data;
				switch (data.command) {
					case 'updateChat':
						messages = data.messages;
						renderMessages();
						break;
					case 'done':
						const submitButton = document.getElementById('submit');
						submitButton.disabled = false;
						submitButton.textContent = 'Send';
						break;
				}
			});

			window.addEventListener('DOMContentLoaded', () => {
				const submitButton = document.getElementById('submit');
				const promptField = document.getElementById('prompt');

				submitButton.addEventListener('click', handleSend);

				promptField.addEventListener('keydown', (e) => {
					if (e.key === 'Enter' && !e.shiftKey) {
						e.preventDefault();
						handleSend();
					}
				});
			});
		</script>
	</head>
	<body>
		<div class="header">
			<h1>BroPilot</h1>
		</div>
		<div class="chat-container" id="chat-container"></div>

		<div class="input-container">
			<textarea id="prompt" placeholder="Type your question..." spellcheck="false"></textarea>
			<button id="submit">Send</button>
		</div>
	</body>
	</html>
	`;
}

export function deactivate() {}
