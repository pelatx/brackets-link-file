# Brackets Link File

Easily link your files (PHP, JavaScript, CSS, images) into the focused document (HTML, PHP, CSS). You can copy several files in one time to your project folders and get them tagged automatically in the current document. 

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

Just right click on a file in the Project tree -> Link File, and the link with the correct relative path will be inserted into the document.  

Watch it in [this video][video-only-linking].  

#### Selecting several files anywhere

Right click on the destination directory in the Project tree -> Link File. You will be prompted with a dialog where you can select one or more files anywhere on your hard disk or any other volume. These files will be automatically copied to this directory and the correct tags will be added in the focused document. 

The custom file selection dialog is also capable of displaying preview thumbnails of image files.

Watch it in [this video][video-copying-and-linking].

## Features

### Supported file types

- PHP files on PHP documents.
- JavaScript files on HTML documents.
- CSS files on HTML documents.
- Image files on HTML and CSS documents.

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

## Credits
Folder icon from [Ionicons][ionicons].

[video-only-linking]: https://vimeo.com/203813633
[video-copying-and-linking]: https://vimeo.com/203813648
[ionicons]: http://ionicons.com/
