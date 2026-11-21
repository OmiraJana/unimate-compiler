

const API_URL = "https://texas-bread-silent-howto.trycloudflare.com/run";

const runButton = document.getElementById("runButton");
const languageSelect = document.getElementById("language");
const codeEditor = document.getElementById("code");
const inputEditor = document.getElementById("input");
const outputArea = document.getElementById("output");

// Initialize Telegram Mini App
const tg = window.Telegram.WebApp;

tg.ready();
tg.expand();

// Run compiler
runButton.addEventListener("click", runCode);

async function runCode() {
    const language = languageSelect.value;
    const code = codeEditor.value;
    const input = inputEditor.value;

    if (!code.trim()) {
        outputArea.textContent = "Please enter some code first.";
        return;
    }

    // Get genuine Telegram initialization data
    const initData = tg.initData;

    if (!initData) {
        outputArea.textContent =
            "Please open this compiler through the Telegram Mini App.";
        return;
    }

    runButton.disabled = true;
    runButton.textContent = "Running...";
    outputArea.textContent = "Compiling and executing your code...";

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                language: language,
                code: code,
                input: input,
                init_data: initData
            })
        });

        const data = await response.json();

        if (!response.ok) {
            outputArea.textContent =
                data.detail || "Something went wrong.";
            return;
        }

        let result = "";

        if (data.output) {
            result += data.output;
        }

        if (data.error) {
            result += (result ? "\n" : "") + data.error;
        }

        if (!result) {
            result = "Program finished. No output.";
        }

        outputArea.textContent = result;

    } catch (error) {
        outputArea.textContent =
            "Unable to connect to the compiler server. Please try again.";
        console.error(error);

    } finally {
        runButton.disabled = false;
        runButton.textContent = "Run Code";
    }
}
