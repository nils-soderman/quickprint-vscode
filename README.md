# **QuickPrint**

A shortcut for quickly adding print statements to your code.

![Demo](https://github.com/nils-soderman/quickprint-vscode/blob/master/media/demo.gif?raw=true)

Simply select what you want to debug, press the assigned hotkey and the print statement will be added on the next line.

Alternitavly you can also copy what you want to print, go to another line in your code and press the Hotkey to add the print statement there.

<br/>

## Hotkeys:

### Default Hotkeys:
* **`F4`** - Quick Print: Adds a print statement of whatever is selected, or your clipboard if nothing is selected.
* **`Shift + F4`** - Quick Print Alternative - Same as as above however it'll use an alternative print statement if avaliable.

### Changing Hotkeys:
Navigate to `File > Preferences > Keyboard Shortcuts` and search for _"quickprint"_. Double klick the shortcut you want to edit and input your new desired hotkey.

<br/>


# Language support:

## **Official Language support:**
* AngelScript _(Unreal Engine)_
* C#
* Java
* Javascript
* PHP
* Python
* TypeScript

<br/>

## **Adding your own language support or modifying current languages:**
QuickPrint allows you to easily add support for any programming language that you're using. Or making modifications to the current languages if you want to switch out the print statement to use another function.

Run the command: `"QuickPrint Edit Languages"` this will open up the language settings file which is stored in a JSON format.

<br/>

Example of what a language pack might look like:

    "javascript" : {
        "function" : "console.log(\"$(TEXT): \" + $(VAR));",
        "alternativeFunction" : "alert($(VAR));",
        "increaseIndentChar": "{",
        "commentChar": "//"
    }

<br/>

* **function** - The main function you want to be added when the command QuickPrint is executed.

* **increaseIndentChar** - The character that's placed after e.g. a function typically something like `{`

* **commentChar** - The character that's used for single line comments.

* **alternativeFunction** - _(Optional)_ Same as function, but can be accessed through an alternative keyboard shortcut.

* **variablePrefix** - _(Optional)_ e.g. PHP has `$` as a prefix for every variable. If the language you're working with has something similar add that character here and QuickPrint will be more convenient to use.

### Formatting the string used for function & alternativeFunction:
* **`$(VAR)`** - The raw selection from your workspace/clipboard.
* **`$(TEXT)`** - The selection from your workspace/clipboard but as a safe string, e.g. not containing any `"` characters.
* **`<selection>`** & **`<\selection>`** - Can be used to determine the cursor position/selection after a print statement has been added. To set the cursor position only `<selection>` can be used, if you want to select a range use `<\selection>` to mark the end position of the selection.