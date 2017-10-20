# (pelatx) File Selection Dialog

This is a self-contained module to be used in [Brackets editor][brackets] extensions, replacing the operating system native file open dialog.

Why do we want to replace the native dialog?

- pFSD allows to selecting several files in one time easily (I could not in my Linux installation with the native dialog).

- Displays image file previews on hovering the file name.

- Unifies the look & feel on the three operating systems in which Brackets run.

## Usage

Simply copy this folder (pFSD) to your extension source folder and load the module:

```
 FileSelectionDialog = require("pFSD/pFileSelectionDialog");
```
There is only one api method. The one that shows the dialog:

```
 FileSelectionDialog.show(options).done(...);
```

Where options is an object to set up the dialog. You can leave it empty (or call ```.show()``` like this) for default values or define only some of them. Here are the default values:

```
DEFAULT_OPTIONS = {
    title: "Select Files",
    proceed: "Proceed",
    cancel: "Cancel",
    checkAll: "Check All",
    uncheckAll: "Uncheck All",
    hiddenToggleLabel: "Show Hidden",
    showHidden: false,
    enableHiddenToggle: true,
    sort: true,
    foldersFirst: true,
    notHiddenFirst: false
};
```

The method returns a promise. Resolved with an array of full paths if there were files selected. Or rejected if not.

## Credits
Icons from [Ionicons][ionicons].

[brackets]: http://brackets.io/
[ionicons]: http://ionicons.com/