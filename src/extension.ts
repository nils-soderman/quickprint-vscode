import * as vscode from 'vscode';

import { env } from 'process';
import { platform } from 'os';

import * as fs from 'fs';


let _extensionDir = "";
let cachedLanguageSettings: any = null;

export async function activate(context: vscode.ExtensionContext) {
	_extensionDir = context.extensionPath;

	let bSaveEventListenerExists = false;
	
	await EnsureLanguageSettingsFilepath();

	context.subscriptions.push(
		vscode.commands.registerCommand('quickprint.print', async () => {
			const LanguageSettings = await GetLanguageSettings();
			QuickPrint(LanguageSettings);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('quickprint.printAlternative', async () => {
			const LanguageSettings = await GetLanguageSettings();
			QuickPrint(LanguageSettings, true);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('quickprint.editLanguages', () => {
			const SettingsFilepath = GetLanguageSettingsFilepath();
			vscode.workspace.openTextDocument(SettingsFilepath).then(doc => {
				vscode.window.showTextDocument(doc).then(editor => {
					if (!bSaveEventListenerExists) {
						vscode.workspace.onDidSaveTextDocument(OnDocumentSaved, null, context.subscriptions);
						bSaveEventListenerExists = true;
					}
					});
				});
		})
	);

}

export function deactivate() { }


/**
 * Event listener to be added when 
 */
function OnDocumentSaved(TextDocument: vscode.TextDocument) {
	// Check if the saved document is the language settings file.
	const languageSettingsFilepath = GetLanguageSettingsFilepath();
	if (TextDocument.fileName.endsWith(languageSettingsFilepath.replace(/^.*[\\\/]/, ''))) {
		// Clear the cache
		cachedLanguageSettings = null;
	}
}

async function GetLanguageSettings() {
	if (cachedLanguageSettings !== null) {
		return cachedLanguageSettings;
	}

	const filepath = GetLanguageSettingsFilepath();
	const languageSettings = fs.readFileSync(filepath, 'utf8');
	try {
		cachedLanguageSettings = JSON.parse(languageSettings);
		return cachedLanguageSettings;
	}
	catch (e) {
		vscode.window.showErrorMessage(`QuickPrint failed to parse the language settings file.\nPlease make sure the file is valid JSON.`);
		return null;
	}
}


async function EnsureLanguageSettingsFilepath() {
	const settingsFilepath = GetLanguageSettingsFilepath();
	// Ensure the file exists
	if (!fs.existsSync(settingsFilepath)) {
		// If the file does not exist, create the file using languages.json as a template.
		const templateFilepath = _extensionDir + "/language_support.json";
		await vscode.workspace.fs.copy(vscode.Uri.file(templateFilepath), vscode.Uri.file(settingsFilepath));
		if (!fs.existsSync(settingsFilepath)) {
			return templateFilepath;
		}
	}
}

/**
 * Get the filepath to the language settings file that's stored under AppData
 */
function GetLanguageSettingsFilepath() {
	// Get the path to the settings file
	const settingsFilename = "quickprint_languages.json";
	let settingsFilepath: string;
	if (platform() === "win32") {
		settingsFilepath = env.APPDATA + '/Code/User/' + settingsFilename;
	}
	else if (platform() === "darwin") {
		settingsFilepath = env.HOME + "/Library/Application Support/Code/User/" + settingsFilename;
	}
	else {
		settingsFilepath = env.HOME + "/.config/Code/User/" + settingsFilename;
	}

	return settingsFilepath;
}

/**
 * Get the raw trimmed code line without any comments, e.g. "def MyFun(): #HELLO" would return "def MyFun():"
 */
function GetLineWithoutComments(line: string, commentChar: string): string {
	if (line.includes(commentChar)) {
		line = line.split(commentChar)[0];
	}
	return line.trim();
}

/**
 * Adds a print statement on the next line in the text editor
 */
function AddPrintStatement(languagePack: any, textToPrint: string, bAlternativePrint: boolean, bUsingClipboardText: boolean) {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return "";
	}

	textToPrint = textToPrint.trim();

	// Load language pack variables
	const commentChar: string = languagePack["commentChar"];
	const increaseIndentChar: string = languagePack["increaseIndentChar"];
	const variablePrefix: string = languagePack["variablePrefix"];
	let printFunction: string = "";
	if (bAlternativePrint) {
		printFunction = languagePack["alternativeFunction"];
	}
	if (!printFunction) {
		printFunction = languagePack["function"];
	}

	const selectedLineNumber = editor.selection.end.line;
	const activeLine = editor.document.lineAt(selectedLineNumber);
	let activeLineText = activeLine.text;
	let lineToInsertPrint = selectedLineNumber;

	// Remove any quotation marks from the string that'll replace $(TEXT)
	let safeString = textToPrint.replace(/\"/g, "");
	safeString = safeString.replace(/'/g, "");

	// Check if variable prefix should be included
	if (variablePrefix) {
		const preText = activeLineText.split(textToPrint)[0];
		const lastChar = preText.trim().substr(preText.length - 1);
		if (lastChar === variablePrefix) {
			textToPrint = variablePrefix + textToPrint;
		}
	}

	// Format the print function
	const bFormatCursorSelection = printFunction.includes("<selection>");
	printFunction = printFunction.replace("$(TEXT)", safeString);
	printFunction = printFunction.replace("$(VAR)", textToPrint);


	// If we're using text selection, correct indentation & line number needs to be figured out
	// Otherwise if the text comes from the clipboard, just insert the print statement at the line where the cursor is.
	if (!bUsingClipboardText) {
		if (selectedLineNumber + 1 < editor.document.lineCount) {
			// If the line after the selected line is only e.g. an { placed after a function, skip to the next line
			let lineText = editor.document.lineAt(selectedLineNumber + 1).text;
			const lineTextWithoutComment = GetLineWithoutComments(lineText, commentChar);
			if (lineTextWithoutComment === increaseIndentChar) {
				lineToInsertPrint++;
				activeLineText = lineText;
			}
		}

		// Figure out the correct indentation
		let currentIndentation = activeLineText.length - activeLineText.trimLeft().length;

		// If the last character is a e.g. {, increase the indentation step by one.
		let lineWithoutComment = GetLineWithoutComments(activeLineText, commentChar);
		const lastChar = lineWithoutComment.trim().substr(lineWithoutComment.length - 1);
		if (lastChar === increaseIndentChar) {
			// Check if document uses spaces or tabs as indentation
			let bUseTabs = false;
			if (!editor.options.insertSpaces) {
				if (currentIndentation) {
					bUseTabs = activeLineText.substring(0, currentIndentation).includes("\t");
				}
				else {
					bUseTabs = editor.document.getText().includes("\t");
				}
			}

			// Figure out how many spaces (or if using tabs) to be added
			let extraIndentantions = "    ";
			if (bUseTabs) {
				extraIndentantions = "\t";
			}
			else {
				const tabSize = editor.options.tabSize;
				if (tabSize !== "auto" || !tabSize) {
					extraIndentantions = " ".repeat((tabSize as number));
				}
			}

			printFunction = extraIndentantions + printFunction;
		}

		// Add a new line character + the current indentation to the print function
		printFunction = "\n" + activeLineText.substring(0, currentIndentation) + printFunction;
	}

	let startCharPos: number;
	let endCharPos: number;
	// Cursor support
	if (bFormatCursorSelection) {
		startCharPos = printFunction.indexOf("<selection>");
		printFunction = printFunction.replace("<selection>", "");

		if (printFunction.includes("</selection>")) {
			endCharPos = printFunction.indexOf("</selection>");
			printFunction = printFunction.replace("</selection>", "");
		}
		else {
			endCharPos = startCharPos;
		}

		if (bUsingClipboardText) {
			startCharPos += editor.selection.start.character;
			endCharPos += editor.selection.start.character;
		}

	}


	// Insert the print function into the text document
	editor.edit(edit => {
		let charInsertPos: number = activeLine.range.end.character;
		if (bUsingClipboardText) {
			charInsertPos = editor.selection.start.character;
		}
		edit.insert(new vscode.Position(lineToInsertPrint, charInsertPos), printFunction);
	}).then(function () {
		if (bFormatCursorSelection) {
			let selectionLine = lineToInsertPrint;
			if (!bUsingClipboardText) {
				selectionLine++;
				startCharPos--;
				endCharPos--;
			}

			const startPosition = new vscode.Position(selectionLine, startCharPos);
			const endPosition = new vscode.Position(selectionLine, endCharPos);
			editor.selection = new vscode.Selection(startPosition, endPosition);
		}
	});

}

/**
 * Main function to be called upon when a command runs and a print statement is supposed to be added.
 */
function QuickPrint(LanguageSettings: any, bAlternativePrint: boolean = false) {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}

	// Check if the language is supported
	const languageId = editor.document.languageId;
	if (!LanguageSettings.hasOwnProperty(languageId)) {
		vscode.window.showErrorMessage(`QuickPrint does currently not support the laungage "${editor.document.languageId}."\nYou can manually add support for it by running the command: "QuickPrint Edit Languages"`);
		return;
	}

	const languagePack = LanguageSettings[languageId];

	// Get selected text and try to use that
	let selectedText = editor.document.getText(editor.selection);
	if (selectedText) {
		AddPrintStatement(languagePack, selectedText, bAlternativePrint, false);
		return;
	}

	// If no text was selected try to get the copied text from the clipboard instead
	vscode.env.clipboard.readText().then(copiedText => {
		if (copiedText) {
			AddPrintStatement(languagePack, copiedText, bAlternativePrint, true);
		}
	});
}