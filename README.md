# Brackets Link File

Easily link your files (PHP, JavaScript, CSS, images, audio, video) into the focused document (HTML, PHP, CSS). You can copy several files in one time to your project folders and get them tagged automatically in the current document. 

Supports linking of existing files in the project tree. Also, with a file selection dialog (with image previews) or directly with drag and drop from OS file browser, allows copying files to project which will be tagged automatically.

It also supports bi-directionality: if you delete a project file, the tag or tags are automatically deleted in the document.

## Install from Brackets

1. Open the Extension Manager from the File menu
2. Search Brackets Link File and install


## Install from file system

1. Download this extension using the ZIP button above and unzip it.
2. Copy it in Brackets' `/extensions/user` folder by selecting `Help > Show Extension Folder` in the menu. 
3. Reload Brackets.

## Usage

(Note that the extension only works if the focused editor file is saved).
#### Files already in the project tree

Just right click on a file in the Project tree -> Link File (Insert Tags), and the link with the correct relative path will be inserted into the document.  

Watch it in [this video][video-only-linking].  

#### Selecting several files anywhere

Right click on the destination directory in the Project tree -> Link File (Insert Tags). You will be prompted with a dialog where you can select one or more files anywhere on your hard disk or any other volume. These files will be automatically copied to this directory and the correct tags will be added in the focused document. 

The custom file selection dialog is also capable of displaying preview thumbnails of image files.

Watch it in [this video][video-copying-and-linking].

#### Dragging and dropping from OS file browser

At the bottom of the sidebar you can see the drop area (resizable). And in it, in the bottom, the current directory where the files that you drop into will be copied. Hover over this to see the full path.

To change the destination directory, right click on the desired in the project tree -> Link File (Set As Drop Area Destination).

Open a file browser on your operating system and drop files into the drop area.

You can toggle show/hide the drop area in View -> Link File Drop Area.

Watch it in [this video][video-dragndrop]

#### Using bi-directional linking

This is a feature disabled by default. Because in projects with an extensive number of directories and files, it can greatly slow down Brackets.

To enable/disable it, go to File Menu -> Link File Watcher.

Once enabled, the extension will recognize when a project file is deleted. And it will automatically delete the corresponding tag in the current document, if any.

Watch it in [this video][video-watcher]

## Features

- Insert tags from already existing files in project tree.
- Copy files to project and tag through a file selection dialog.
- Image previews in file selection dialog.
- Drag and drop files directly from OS file browser.
- Non taggable files are copied anyway to project.
- Bi-directional linking: delete a project file and referred tags will be deleted in document automatically.

#### Supported file types

- PHP files on PHP documents.
- JavaScript files on HTML documents.
- CSS files on HTML documents.
- Image files on HTML and CSS documents.
- Audio and Video files on HTML documents.

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

## Credits
Folder icon from [Ionicons][ionicons].

[video-only-linking]: https://vimeo.com/203813633
[video-copying-and-linking]: https://vimeo.com/203813648
[video-dragndrop]: https://vimeo.com/223621373
[video-watcher]: https://vimeo.com/228543196
[ionicons]: http://ionicons.com/
