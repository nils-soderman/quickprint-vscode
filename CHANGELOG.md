# Change Log

## [1.0.3] - 2023-07-20
- Default python print now uses f-strings
- Use esbuild to build & minify the extension


## [1.0.2]
- Commands are now placed under the category "QuickPrint"


## [1.0.1]
- Clipboard text is now always pasted at the cursor position instead of at the end of the line
- Fixed `<selection>` selecting the wrong characters if the clipboard text was used


## [1.0.0]
- Official release
- `<selection>` & `<\selection>` can now be used when formatting the print function to determine cursor position/selection after adding a print statement.
- Renamed commands: 
  - "Quick Print" -> "QuickPrint"
  - "Quick Print Edit Languages" -> "QuickPrint Edit Languages"


## [0.1.2]
- Added support for AngelScript _(Unreal Engine)_
- VS Code no longer needs to be reloaded after editing the `quickprint_languages.json` file.


## [0.1.1]
- Added option _"variablePrefix"_ to the language_support.json. For example PHP has `$` as a prefix for each variable.
- The `language_support.json` file is no longer imported


## [0.1]

- Initial release