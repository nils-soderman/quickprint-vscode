# **QuickPrint**

A shortcut for quickly adding print statements to your code.

![Demo](https://nilssoderman.com/resources/images/gifs/quick-selection-demo.gif)


Simply select what you want to debug, press the assigned hotkey and the print statement will be added on the next line.

Alternitavly you can also copy what you want to print, go to another line in your code and press the Hotkey to add the print statement there.

<br/>

## Default Hotkeys:
* **F4** - Quick Print: Adds a print statement of whatever is selected, or your clipboard if nothing is selected.
* **Shift + F4** - Quick Print Alternative - Same as as above however it'll use an alternative print statement if avaliable.

<br/>

# Language support:

## **Official Language support:**
* C#
* Java
* Javascript
* PHP
* Python
* TypeScript

<br/>

## **Adding your own language support:**
QuickPrint allows you to easily add support for any programming language that you're using.

Run the command: "QuickPrint Edit Languages" this will open up the language settings file which is stored in a JSON format.

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
    * To insert the selection into the string you can use $(VAR)
    * You can also use $(TEXT) to insert the selection as a safe string that can be used as a prefix in the print statement.

* **alternativeFunction** - _(Optional)_ If there's an alternative way you like to sometimes print variables you can add that function here.

* **increaseIndentChar** - The char that's placed after e.g. a function typically something like {

* **commentChar** - The char that's used for single line comments.


