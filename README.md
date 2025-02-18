# Bropilot README

## Setup

1. Install npm
2. Install ollama `npm install -g ollama`
3. Download llm `ollama run ~llm~` get LLM name the ollama website
4. In the `ollama.chat method` change the model to the LLM version

   ```javascript
   const streamRes = await ollama.chat({
     model: "deepseek-r1:671b",
     messages: [{ role: "user", content: prompt }],
     stream: true,
   });
   ```

## FAQ

1. I downloaded a model and need to free up space to install a different model
   - Delete the model from `~/.ollama/models` and run `ollama run ~llm~` to download the new model

## How to run in development

`cmd + shift + p` -> `Debug: Select and Start Debugging` -> `F5`

## Features

- Inline Autocompletion:
  Get code snippet suggestions based on context using your local LLM via Ollama. Suggestions appear as ghost text in your editor and can be accepted with Tab.

- Interactive Chat Panel:
  Open a dedicated chat panel to have an interactive conversation with your LLM for more complex queries and debugging help.

- Toggle Autocompletion:
  Easily enable or disable inline autocompletion via a command in the Command Palette.

## Screenshots

## Requirements

- Node.js & npm: Ensure Node.js and npm are installed.
- Ollama CLI: Installed globally via `npm install -g ollama`
- A Supported LLM: Download and run your preferred LLM from Ollama (see Setup instructions).

## Extension Settings

Bropilot adds the following VS Code commands (via the contributes.commands extension point):

- bropilot.openChat: Opens the interactive chat panel.
- bropilot.toggleAutocomplete: Toggles inline autocompletion on and off.
  You can further configure these settings in your VS Code settings if you add configuration options in the future.

## Known Issues

Model Response Format:
If the LLM does not return a Markdown code block as expected, the extension may display the full explanation. Ensure that your prompt is explicit and the LLM supports returning only code snippets.
Performance:
Autocompletion quality may vary depending on your local machine performance and the chosen model.

## Release Notes

- 1.0.0
    Initial release of Bropilot.
Added inline autocompletion powered by a local LLM via Ollama.
Introduced interactive chat panel for extended conversation with the model.
- 1.0.1
Fixed minor issues with code snippet extraction.
Added a command to toggle autocompletion.
- 1.1.0
Improved prompt instructions for better code-only responses.
Enhanced logging for easier debugging.
