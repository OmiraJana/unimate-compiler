const samples = {
  c: `#include <stdio.h>

int main() {
    printf("Hello, Unimate!\\n");
    printf("Welcome to C programming.");
    return 0;
}`,
  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Unimate!");
        System.out.println("Welcome to Java programming.");
    }
}`
};

const editor = document.querySelector("#codeEditor");
const languageSelect = document.querySelector("#language");
const lineNumbers = document.querySelector("#lineNumbers");
const fileName = document.querySelector("#fileName");
const fileIcon = document.querySelector("#fileIcon");
const output = document.querySelector("#output");
const runTime = document.querySelector("#runTime");
const statusDot = document.querySelector("#statusDot");
const runButton = document.querySelector("#runButton");

function updateLines() {
  const count = Math.max(1, editor.value.split("\n").length);
  lineNumbers.innerHTML = Array.from({ length: count }, (_, index) => `<span>${index + 1}</span>`).join("");
}

function setLanguage(language) {
  editor.value = samples[language];
  fileName.textContent = language === "c" ? "main.c" : "Main.java";
  fileIcon.textContent = language === "c" ? "C" : "J";
  updateLines();
}

editor.addEventListener("input", updateLines);
editor.addEventListener("scroll", () => {
  lineNumbers.scrollTop = editor.scrollTop;
});
editor.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.setRangeText("    ", start, end, "end");
    editor.dispatchEvent(new Event("input"));
  }
});

languageSelect.addEventListener("change", () => setLanguage(languageSelect.value));
document.querySelector("#resetButton").addEventListener("click", () => setLanguage(languageSelect.value));

document.querySelector("#clearButton").addEventListener("click", () => {
  output.textContent = "";
  output.className = "output-content";
  runTime.textContent = "";
  statusDot.className = "status-dot";
});

document.querySelector("#copyButton").addEventListener("click", async () => {
  await navigator.clipboard.writeText(output.textContent);
});

document.querySelector("#themeButton").addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

async function runCode() {
  const language = languageSelect.value;
  runButton.disabled = true;
  output.className = "output-content running";
  output.textContent = "Compiling...";
  statusDot.className = "status-dot";
  runTime.textContent = "";

  try {
    const response = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, code: editor.value })
    });
    const result = await response.json();
    output.textContent = result.output;
    output.className = `output-content${result.success ? "" : " error"}`;
    statusDot.className = `status-dot ${result.success ? "success" : "error"}`;
    runTime.textContent = result.time || "";
  } catch (error) {
    output.textContent = `Could not execute code: ${error.message}`;
    output.className = "output-content error";
    statusDot.className = "status-dot error";
  } finally {
    runButton.disabled = false;
  }
}

runButton.addEventListener("click", runCode);
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") runCode();
});

setLanguage("c");
