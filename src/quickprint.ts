import * as vscode from 'vscode';
import { env } from 'process';
import { existsSync } from 'fs';
import { platform } from 'os';

// This needs to be imported just to be included in the build, look into if there's a better way of doing this.
import * as Data from './languages.json';


export function activate(context: vscode.ExtensionContext) {

	let disposablePrint = vscode.commands.registerCommand('quickprint.print', () => {
		GetLanguageSettingsFilepath().then( SettingsFilepath => {
			import(SettingsFilepath).then( LanguageSettings => {
				QuickPrint(LanguageSettings);
			});
		});
	});
	
	let disposablePrintSpecial = vscode.commands.registerCommand('quickprint.printAlternative', () => {
		GetLanguageSettingsFilepath().then( SettingsFilepath => {
			import(SettingsFilepath).then( LanguageSettings => {
				QuickPrint(LanguageSettings, true);
			});
		});
	});

	let disposableEditLang = vscode.commands.registerCommand('quickprint.editLanguages', () => {
		GetLanguageSettingsFilepath().then( SettingsFilepath => {
			vscode.workspace.openTextDocument(SettingsFilepath).then(doc => {
				vscode.window.showTextDocument(doc);
			});
		});
	});

	context.subscriptions.push(disposablePrint);
	context.subscriptions.push(disposablePrintSpecial);
	context.subscriptions.push(disposableEditLang);
}

export function deactivate() {}

/**
 * Get the filepath to the language settings file that's stored under AppData
 */
async function GetLanguageSettingsFilepath()
{
	// Get the path to the settings file
	const settingsFilename = "quickprint_languages.json";
	var settingsFilepath:string;
	if (platform() == "win32")
		settingsFilepath = env.APPDATA + '/Code/User/' + settingsFilename;
	else if (platform() == "darwin")
		settingsFilepath = env.HOME + "/Library/Application Support/Code/User/" + settingsFilename;
	else
		settingsFilepath = env.HOME + "/.config/Code/User/" + settingsFilename;
		
		
	// Ensure the file exists
	if (!existsSync(settingsFilepath)) {
		// If the file does not exist, create the file using languages.json as a template.
		const templateFilepath = __dirname + "/languages.json";
		await vscode.workspace.fs.copy(vscode.Uri.file(templateFilepath), vscode.Uri.file(settingsFilepath));
		if (!existsSync(settingsFilepath)) {
			return templateFilepath;
		}
	}

	return settingsFilepath;
}

/**
 * Get the raw trimmed code line without any comments, e.g. "def MyFun(): #HELLO" would return "def MyFun():"
 */
function GetLineWithoutComments(line:string, commentChar:string) : string
{
	if (line.includes(commentChar))
		line = line.split(commentChar)[0];
	return line.trim();
}

/**
 * Adds a print statement on the next line in the text editor
 */
function AddPrintStatement(languagePack:any, textToPrint:string, bAlternativePrint:boolean, bUsingClipboardText:boolean)
{
	const editor = vscode.window.activeTextEditor;
	if (!editor)
		return  "";
	
	textToPrint = textToPrint.trim();

	// Load language pack variables
	const commentChar:string = languagePack["commentChar"];
	const increaseIndentChar:string = languagePack["increaseIndentChar"];
	var printFunction:string = "";
	if (bAlternativePrint)
	{
		printFunction = languagePack["alternativeFunction"];
	}
	if (!printFunction)
	{
		printFunction = languagePack["function"];
	}

	// Remove any quotation marks from the string that'll replace $(TEXT)
	var safeString = textToPrint.replace(/\"/g, "");
	safeString = safeString.replace(/'/g, "");

	// Format the print function
	printFunction = printFunction.replace("$(TEXT)", safeString);
	printFunction = printFunction.replace("$(VAR)", textToPrint);

	const selectedLineNumber = editor.selection.end.line;
	const activeLine = editor.document.lineAt(selectedLineNumber);
	var activeLineText = activeLine.text;
	var lineToInsertPrint = selectedLineNumber;

	// If we're using text selection, correct indentation & line number needs to be figured out
	// Otherwise if the text comes from the clipboard, just insert the print statement at the line where the cursor is.
	if (!bUsingClipboardText)
	{
		if (selectedLineNumber + 1 < editor.document.lineCount)
		{
			// If the line after the selected line is only e.g. an { placed after a function, skip to the next line
			var lineText = editor.document.lineAt(selectedLineNumber + 1).text;
			const lineTextWithoutComment = GetLineWithoutComments(lineText, commentChar);
			if (lineTextWithoutComment == increaseIndentChar)
			{
				lineToInsertPrint++;
				activeLineText = lineText;
			}
		}
		
		// Figure out the correct indentation
		var currentIndentation = activeLineText.length - activeLineText.trimLeft().length;

		// If the last character is a e.g. {, increase the indentation step by one.
		var lineWithoutComment = GetLineWithoutComments(activeLineText, commentChar);
		const lastChar = lineWithoutComment.trim().substr(lineWithoutComment.length - 1);
		if (lastChar == increaseIndentChar)
		{
			// Check if document uses spaces or tabs as indentation
			var bUseTabs = false;
			if (!editor.options.insertSpaces)
			{
				if (currentIndentation)
					bUseTabs = activeLineText.substring(0, currentIndentation).includes("\t");
				else
					bUseTabs = editor.document.getText().includes("\t");
			}

			// Figure out how many spaces (or if using tabs) to be added
			var extraIndentantions = "    ";
			if (bUseTabs)
			{
				extraIndentantions = "\t";
			}
			else
			{
				const tabSize = editor.options.tabSize;
				if (tabSize != "auto" || !tabSize)
				{
					extraIndentantions = " ".repeat((tabSize as number));
				}
			}

			printFunction = extraIndentantions + printFunction;
		}

		// Add a new line character + the current indentation to the print function
		printFunction = "\n" + activeLineText.substring(0, currentIndentation) + printFunction;
	}
	
	// Insert the print function into the text document
	editor.edit(edit => {
		edit.insert(new vscode.Position(lineToInsertPrint, activeLine.range.end.character), printFunction);
	});

}

/**
 * Main function to be called upon when a command runs and a print statement is supposed to be added.
 */
function QuickPrint(LanguageSettings:any, bAlternativePrint:boolean = false)
{
	const editor = vscode.window.activeTextEditor;
	if(!editor)
		return;

	// Check if the language is supported
	const languageId = editor.document.languageId;
	if (!LanguageSettings.hasOwnProperty(languageId))
	{
		vscode.window.showErrorMessage(`QuickPrint does currently not support the laungage "${editor.document.languageId}."\nYou can manually add support for it by running the command: "QuickPrint Edit Languages"`);
		return;
	}

	const languagePack = LanguageSettings[languageId];

	// Get selected text and try to use that
	var selectedText = editor.document.getText(editor.selection);
	if (selectedText)
	{
		AddPrintStatement(languagePack, selectedText, bAlternativePrint, false);
		return;
	}

	// If no text was selected try to get the copied text from the clipboard instead
	vscode.env.clipboard.readText().then( copiedText => {
		if (copiedText)
		{
			AddPrintStatement(languagePack, copiedText, bAlternativePrint, true);
		}
	});
}