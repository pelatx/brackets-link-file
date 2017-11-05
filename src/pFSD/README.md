# (pelatx) File Selection Dialog

This is a self-contained module to be used in [Brackets editor][brackets] extensions, replacing the operating system native file open dialog.

Why do we want to replace the native dialog?

- pFSD allows to selecting several files in one time easily (I could not in my Linux installation with the native dialog).

- Displays image file previews on hovering the file name.

- Unifies the look & feel on the three operating systems in which Brackets run.

## Features

- Multi file selection via checkboxes.

- Windows OS filesystem volumes support.

- Remembers the last directory where a file was copied from.

- Directory navigation bar (optional).

- Image file previews on hover (optional).

- Show hidden files and folders (optional).

- Filterable file list via filer box (optional).

- Pre-defined filter sets on filter box right click (optional).

- Brackets dark/light themes adaptation.

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
        /* Labels section */
        title: "Select Files", // Dialog tittle
        proceed: "Proceed", // Button
        cancel: "Cancel", // Button
        checkAll: "Check All", // Button
        uncheckAll: "Uncheck All", // Button
        hiddenToggleLabel: "Show Hidden", // Show hidden checkbox label
        filterBoxPlaceholder: "Filter ...", 

        /* Functionalities */
        showHidden: false, // Show hidden files
        enableHiddenToggle: true, // Insert a checkbox to enable/disable show hidden
        enableFilterBox: true, // Input box to filter the file list
        enableNavBar: true, // Directory navigation bar
        enableImagePreviews: true, // Image file previews on hover
        sort: true, // Sort alphabetically
        foldersFirst: true, // Show folders first
        notHiddenFirst: false, // Show not hidden files first
        // Filter sets selectables on filter box right click.
        // In the form 'label: "filter1 filter2 filter3 ..."'.
        // Example:
        // {
        //    Images: ".jpg .png .svg .gif",
        //    Audio: ".ogg .mp3 .wav",
        //    Video: ".ogv .ogg .mp4 .webm",
        //    Development: ".js .css .html .php"
        // }
        filterSets: {} 
    };
```

The method returns a promise. Resolved with an array of full paths if there were files selected. Or rejected if not.

## Credits
Icons from [Ionicons][ionicons].

[brackets]: http://brackets.io/
[ionicons]: http://ionicons.com/