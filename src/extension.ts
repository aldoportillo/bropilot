import * as vscode from 'vscode';
import ollama from 'ollama';

let autocompletionEnabled = false;

function extractCodeSnippet(text: string): string {
  const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/;
  const match = text.match(codeBlockRegex);
  if (match && match[1]) {
    return match[1].trim();
  }
  return text.trim();
}

export function activate(context: vscode.ExtensionContext) {
  console.log('BroPilot extension is activating...');

  const chatDisposable = vscode.commands.registerCommand('bropilot.openChat', () => {
    openChatPanel();
  });
  context.subscriptions.push(chatDisposable);

  /*
	* Developer Notes *
	* This is the code block for auto completions. 
	* I recommend using a light weight model for this. 
	* I run a M4 Max Chip 64GB RAM Machine
	* For this machine `deepseek-r1:7b` works best
	*/
  const toggleAutocompleteDisposable = vscode.commands.registerCommand('bropilot.toggleAutocomplete', () => {
    autocompletionEnabled = !autocompletionEnabled;
    vscode.window.showInformationMessage(
      `BroPilot autocompletion is now ${autocompletionEnabled ? 'enabled' : 'disabled'}.`
    );
  });
  context.subscriptions.push(toggleAutocompleteDisposable);

  const completionProvider = vscode.languages.registerCompletionItemProvider(
    { scheme: 'file' },
    {
      async provideCompletionItems(document, position, token, completionContext) {
        console.log("Autocomplete triggered at position:", position);
        if (!autocompletionEnabled) {
          return [];
        }
        try {
          const startLine = Math.max(0, position.line - 10);
          const range = new vscode.Range(new vscode.Position(startLine, 0), position);
          const promptContext = document.getText(range);

          const prompt = `Generate only a code snippet with no explanation. Return only a Markdown code block wrapped in triple backticks, and nothing else.

Context:
${promptContext}`;

          const response = await ollama.chat({
            model: 'deepseek-r1:7b',
            messages: [{ role: 'user', content: prompt }],
            stream: false
          });

          const fullResponse = response.message.content;
          console.log("Full API response:", fullResponse);

          const codeSuggestion = extractCodeSnippet(fullResponse);
          console.log("Extracted code snippet:", codeSuggestion);

          const completionItem = new vscode.CompletionItem(
            codeSuggestion,
            vscode.CompletionItemKind.Snippet
          );
          completionItem.insertText = new vscode.SnippetString(codeSuggestion);
          completionItem.detail = 'BroPilot Code Suggestion (Ollama)';
          return [completionItem];
        } catch (error: any) {
          console.error('Error fetching autocomplete suggestion:', error);
          return [];
        }
      }
    },
    ''
  );
  context.subscriptions.push(completionProvider);
}

export function deactivate() {}

/*
	* Developer Notes *
	* This is the code block for chat panel. 
	* This is more like a chat and it is meant for a heavier model. 
	* I personally run `deepseek-r1:70b`
	* If you are looking to make a PR maybe fixing the styling or adding context for all files would be nice.
*/
function openChatPanel() {
  const panel = vscode.window.createWebviewPanel(
    'bropilotChat',
    'BroPilot Chat',
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
          panel.webview.postMessage({ command: 'updateChat', messages: conversation });
        }
      } catch (error: any) {
        conversation.push({
          role: 'assistant',
          content: `Error: ${error.message}`
        });
        panel.webview.postMessage({ command: 'updateChat', messages: conversation });
      } finally {
        panel.webview.postMessage({ command: 'done' });
      }
    }
  });
}

function getWebviewContent(): string {
  return /*html*/ `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BroPilot Chat</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github-dark.min.css" />
    <style>
      html, body { height: 100%; padding: 0; margin: 0; }
      body { display: flex; flex-direction: column; font-family: sans-serif; background-color: var(--vscode-editor-background); color: var(--vscode-editor-foreground); }
      .header { padding: 1rem; background-color: var(--vscode-button-background); color: var(--vscode-button-foreground); }
      .chat-container { flex: 1; padding: 1rem; overflow-y: auto; }
      .input-container { display: flex; padding: 1rem; border-top: 1px solid var(--vscode-button-border); }
      #prompt { flex: 1; height: 60px; padding: 0.5rem; }
      #submit { margin-left: 0.5rem; padding: 0.5rem 1rem; cursor: pointer; }
      .message-row { margin-bottom: 1rem; }
      .message { padding: 0.75rem; border-radius: 8px; white-space: pre-wrap; }
      .user-message { background-color: var(--vscode-editorSelectionBackground); color: white; align-self: flex-end; }
      .assistant-message { background-color: var(--vscode-notificationsBackground); color: var(--vscode-editor-foreground); align-self: flex-start; }
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
          bubble.classList.add(msg.role === 'user' ? 'user-message' : 'assistant-message');
          bubble.innerHTML = marked.parse(msg.content);
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
        vscode.postMessage({ command: 'submit', prompt: prompt });
        promptField.value = '';
      }

      window.addEventListener('message', event => {
        const data = event.data;
        if (data.command === 'updateChat') {
          messages = data.messages;
          renderMessages();
        } else if (data.command === 'done') {
          const submitButton = document.getElementById('submit');
          submitButton.disabled = false;
          submitButton.textContent = 'Send';
        }
      });

      window.addEventListener('DOMContentLoaded', () => {
        document.getElementById('submit').addEventListener('click', handleSend);
        document.getElementById('prompt').addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        });
      });
    </script>
  </head>
  <body>
    <div class="header"><h1>BroPilot Chat</h1></div>
    <div class="chat-container" id="chat-container"></div>
    <div class="input-container">
      <textarea id="prompt" placeholder="Type your message..."></textarea>
      <button id="submit">Send</button>
    </div>
  </body>
  </html>
  `;
}
