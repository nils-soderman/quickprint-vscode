import * as vscode from 'vscode';
import * as data from "./languages.json";

export function activate(context: vscode.ExtensionContext) {

	let disposablePrint = vscode.commands.registerCommand('quickprint.print', () => {
		main();
	});

	let disposablePrintSpecial = vscode.commands.registerCommand('quickprint.printAlternative', () => {
		main(true);
	});

	let disposableEditLang = vscode.commands.registerCommand('quickprint.editLanguages', () => {
		vscode.workspace.openTextDocument("./languages.json");
	});

	context.subscriptions.push(disposablePrint);
	context.subscriptions.push(disposablePrintSpecial);
}

export function deactivate() {}


// Get the selected text in the editor
function GetSelectedText() : string
{
	const editor = vscode.window.activeTextEditor;
	if (!editor)
		return  "";

	return editor.document.getText(editor.selection);
}

// Get the raw trimmed code line without any comments, e.g. "def MyFun(): #HELLO" would return "def MyFun():"
function GetLineWithoutComments(line:string, commentChar:string) : string
{
	if (line.includes(commentChar))
		line = line.split(commentChar)[0];
	return line.trim();
}


function AddPrintStatement(textToPrint:string, languageId:string, bAlternativePrint:boolean)
{
	const editor = vscode.window.activeTextEditor;
	if (!editor)
		return  "";

	textToPrint = textToPrint.trim();


	const commentChar:string = (data as any)[languageId]["commentChar"];
	const increaseIndentChar:string = (data as any)[languageId]["increaseIndentChar"];
	var printFunction:string = "";
	if (bAlternativePrint)
	{
		printFunction = (data as any)[languageId]["alternativeFunction"];
	}
	if (!printFunction)
	{
		printFunction = (data as any)[languageId]["function"];
	}

	const lineNumber = editor.selection.end.line;

	const activeLine = editor.document.lineAt(lineNumber);
	var activeLineText = activeLine.text;

	// Find out which line to add the print statement too
	
	var lineToInsertPrint = lineNumber;
	for (var i = lineNumber + 1; i < editor.document.lineCount; i++) {
		var lineText = editor.document.lineAt(i).text;
		const lineTextWithoutComment = GetLineWithoutComments(lineText, commentChar);
		if (lineTextWithoutComment == increaseIndentChar)
		{
			lineToInsertPrint ++;
			activeLineText = lineText;
		}
			
		break;
	}

	// Get the text as a safe string to print
	var safeString = textToPrint.replace(/\"/g, "");
	safeString = safeString.replace(/'/g, "");

	
	printFunction = printFunction.replace("$(TEXT)", safeString);
	printFunction = printFunction.replace("$(VAR)", textToPrint);
	
	var indentation = activeLineText.length - activeLineText.trimLeft().length;

	var newIndentantions = "";
	var numberOfSpaces = 0;
	var lineWithoutComment = GetLineWithoutComments(activeLineText, commentChar);
	const lastChar = lineWithoutComment.trim().substr(lineWithoutComment.length - 1);
	if (lastChar == increaseIndentChar)
	{
		//vscode.window.showInformationMessage("Increase indent");
		// Increase the indentation
		editor.options.insertSpaces;
		var tabSize = editor.options.tabSize;
		if (tabSize != "audo" || !tabSize)
		{
			newIndentantions = " ".repeat((tabSize as number))
		}
	}

	
	if (activeLineText.trim())
	{
		printFunction = newIndentantions + activeLineText.substring(0, indentation) + printFunction;
		printFunction = "\n" + printFunction;
	}
	else
	{
		printFunction = newIndentantions + printFunction;
	}
	
	// Insert the print function into the text document
	editor.edit(edit => {
		edit.insert(new vscode.Position(lineToInsertPrint, activeLine.range.end.character), printFunction);
	});

}


function main(bAlternativePrint:boolean = false)
{
	// Check if the language is supported
	const editor = vscode.window.activeTextEditor;5
	if(!editor)
		return;
	const languageId = editor.document.languageId;
	if (!data.hasOwnProperty(languageId))
	{
		vscode.window.showErrorMessage(`QuickPrint does currently not support the laungage "${editor.document.languageId}."\nYou can manually add support for it by running the command: "QuickPrint Edit Languages"`);
		return;
	}

	// Use selection
	var selectedText = GetSelectedText();
	if (selectedText)
	{
		AddPrintStatement(selectedText, languageId, bAlternativePrint);
		return;
	}

	// No text was selected try to get the copied text instead
	vscode.env.clipboard.readText().then((copiedText)=>{
		if (copiedText)
		{
			AddPrintStatement(copiedText, languageId, bAlternativePrint);
		}
	});
}