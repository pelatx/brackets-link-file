# Brackets Link File

Easily insert links to javascript scripts, CSS files and image files, into focused HTML document. As well as include PHP files into focused PHP documents. 

Now with a new feature: right click on a directory in the project tree and you will be prompted with a dialog where you can select one or more files anywhere on your mounted volumes. These files will be automatically copied to this directory and the necessary tags will be added in the focused document.

## Install from Brackets

1. Open the Extension Manager from the File menu
2. Search Brackets Link File and install


## Install from file system

1. Download this extension using the ZIP button above and unzip it.
2. Copy it in Brackets' `/extensions/user` folder by selecting `Help > Show Extension Folder` in the menu. 
3. Reload Brackets.

## Instructions

(Note that the extension only works if the focused editor file is saved).
#### Original usage

Just right click on a file in the Project tree -> Link File, and the link with the correct relative path will be inserted into the document. Watch it in [this video][video-only-linking].  

#### New feature usage

Right click on a directory in the Project tree -> Link File. You will be prompted with a dialog where you can select one or more files anywhere on your hard disk. These files will be automatically copied to this directory and the necessary tags will be added in the focused document. Watch it in [this video][video-copying-and-linking].

## Changelog

v1.0.1 - Fixed double quotes instead of simple in script and stylesheet tags.   
v1.1.0 - Added support for image links in HTML and CSS.  
v1.2.0 - Changes:
- New operating mode: automatic copy and link of files anywhere on any mounted volume to the project.
- Added height and width to image tag.
- Added support for SVG images.

## Credits
Folder icon from [Ionicons][ionicons].

[video-only-linking]: https://vimeo.com/203813633
[video-copying-and-linking]: https://vimeo.com/203813648
[ionicons]: http://ionicons.com/
