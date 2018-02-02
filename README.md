# Brackets Link File

Easily link your files (PHP, JavaScript, CSS, images, audio, video, fonts) into the focused document (HTML, PHP, CSS). You can copy several files in one time to your project folders and get them tagged automatically in the current document. 

Supports linking of existing files in the project tree. Also, with a file selection dialog (with image previews) or directly with drag and drop from OS file browser, allows copying files to project which will be tagged automatically.

It also supports bi-directionality: if you delete or rename a project file, the tag or tags are automatically deleted or updated in the document.

Supports direct download of libraries from CDN. You can download and link the library automatically in the document. Or just get a tag with the URL of the library for remote usage.

#### Important!

GNU/Linux users can't drag & drop files from OS file browser in Brackets 1.11 and 1.12, because It has completely lost this functionality on this operating system. 

## Install from Brackets

1. Open the Extension Manager from the File menu
2. Search Brackets Link File and install


## Install from file system

1. Download this extension using the ZIP button above and unzip it.
2. Copy it in Brackets' `/extensions/user` folder by selecting `Help > Show Extension Folder` in the menu. 
3. Reload Brackets.

## Usage

(Note that the extension only works if the focused document was saved previously).
#### Files already in the project tree

Just right click on a file in the Project tree -> Link File (Insert Tags), and the link with the correct relative path will be inserted into the document.  

Watch it in [this video][video-only-linking].  

#### Selecting several files anywhere

Right click on the destination directory in the Project tree -> Link File (Insert Tags). You will be prompted with a dialog where you can select one or more files anywhere on your hard disk or any other volume. These files will be automatically copied to this directory and the correct tags will be added in the focused document. 

The custom file selection dialog is capable of displaying preview thumbnails of image files, filter the file list via filter input box (rigth click it to get a dropdown menu with pre-defined filter sets) and toggle showing hidden files.

Watch it in [this video][video-copying-and-linking].

#### Dragging and dropping from OS file browser

At the bottom of the sidebar you can see the drop area (resizable). And in it, in the bottom, the current directory where the files that you drop into will be copied. Hover over this to see the full path.

To change the destination directory, right click on the desired in the project tree -> Link File (Set As Drop Area Destination).

Open a file browser on your operating system and drop files into the drop area.

You can toggle show/hide the drop area in View -> Link File Drop Area.

Watch it in [this video][video-dragndrop]

#### Using bi-directional linking

This is a feature disabled by default. Because in projects with an extensive number of directories and files, it can slow down Brackets a bit.

To enable/disable it, go to File Menu -> Link File Watcher.

Once enabled, the extension will recognize when a project file is deleted or renamed. If deleted, It will automatically delete the corresponding tags in the current document. If renamed, It will automatically update tags according the new name.

Watch it in [this video][video-watcher]

#### Downloading or getting tags from JSDelivr CDN libraries.

Right click on the destination directory in the Project tree -> Link File (Download Library). You will be prompted with a dialog where you can see the library list. 

You can click on library name to get description, author, homepage and Github page.* 

Every library item has four buttons on right side. The one starting from right, lets you choose the library version to use.

Second one let you choose the target file to download or get tagged.

Third one inserts a tag with the library file URL for remore usage. 

And the fourth button downloads the library file to the selected folder and insert the corresponding tag in the active document with the correct relative path.

Watch it in [this video][video-downloader] 

\* *New jsDelivr API don't provide this kind of information. We are using the old API for that. For this reason, many libraries that were not found in the old API will not have a description.*

## Features

- Insert tags from already existing files in project tree.
- Copy files to project and tag through a file selection dialog.
- Image previews in file selection dialog.
- Drag and drop files directly from OS file browser.
- Non taggable files are copied anyway to project.
- Bi-directional linking: delete or rename a project file and referred tags will be deleted or updated in document automatically.
- Internationalization.
- CDN library download and automatic tag in active document (only JavaScript and CSS files).
- CDN library direct tag for remote usage (possibly any supported file).

#### Supported file types

- PHP files on PHP documents.
- JavaScript files on HTML documents.
- CSS files on HTML and CSS documents.
- Image files on HTML and CSS documents.
- Audio and Video files on HTML documents.
- Font files on CSS documents.

## Changelog

v1.0.1 - Fixed double quotes instead of simple in script and stylesheet tags.   
v1.1.0 - Added support for image links in HTML and CSS.  
v1.2.0 - Changes:
- Automatic copy and link of files anywhere on any mounted volume to the project.
- Added height and width to image tag.
- Added support for SVG images.  

v1.3.0 - Changes:
- Image previews in the file selection dialog.
- Fixed problems with paths containing single quotes.
- Some minor fixes.

v1.4.0 - Added Drag and Drop support.

v1.5.0 - Changes:
- Added toggle show/hide Drop Area in View menu.
- Added support for audio and video.

v1.6.0 Added bi-directional linking.

v1.6.1 Fixed "wrong root" bug on project change.

v1.7.0 Internationalization support: english, spanish, french.

v1.7.1 Fixed package.json missing translations.

v1.8.0 - Changes:
- CDN library downloader (or only tag for remote usage).
- Code modularization and refactoring.
- Some little fixes.
- Complete internationalization.

v1.9.0 German translations.

v2.0.0 - Improved file selection dialog:
- Filter box with four pre-defined filter sets (Images, Audio, Video, Development).
- Improved directory navigation bar.
- Shows hidden files.
- Hidden files toggle to show/hide them.
- Fade in for image file previews.
- Refactoring and modularization.

v2.1.0 - Changes:
- Improved CDN downloader:
    - Library description and author.
    - Library homepage and/or Github repository links.
    - Library files are now browsable and selectable. It's possible to download only Javascript and CSS files. But getting the CDN url tag of any file type is supported.
- Support for CSS on CSS documents (@import).
- Support for Font files (.eot, .ttf, .woff, .woff2, .otf) on CSS documents.

v2.2.0 - Improved bi-directionality:
- Changed the way in which the project is monitored. Now much more efficient. It no longer causes a considerable drop in the performance of Brackets. Even with very large projects it remains usable.
- Support to update the tags when a project file is renamed.
- Bug fixes.

v2.3.0 - Improved CDN downloader/tagger:
- Now It consumes the new jsDelivr API, giving the user access to more libraries in their latest versions.
- Loader animation while It fetches libraries.
- Support for downloading/tag several libraries in one dialog instance. Before, the dialog was closed downloading or linking once.

## Credits
Icons from [Ionicons][ionicons].

CDN downloads from [jsDelivr][jsdelivr].

[video-only-linking]: https://vimeo.com/203813633
[video-copying-and-linking]: https://vimeo.com/203813648
[video-dragndrop]: https://vimeo.com/223621373
[video-watcher]: https://vimeo.com/228543196
[video-downloader]: https://vimeo.com/237735327
[ionicons]: http://ionicons.com/
[jsdelivr]: https://www.jsdelivr.com/
