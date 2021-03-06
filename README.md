# Material Scanner

## Live Demo in Web Browser

[yertleturtlegit.github.io/material-scanner](https://yertleturtlegit.github.io/material-scanner/)

## Run on nearly every Local Maschine in Web Browser

1. Clone the repository recursively:

   ```bash
   git clone --recursive https://github.com/YertleTurtleGit/material-scanner
   ```

2. Open your preferred web browser and open the
   ['index.html'](index.html) file.

## Code Editing and Building on Local Maschine

0. You need to have Visual Studio Code
   ([code.visualstudio.com](https://code.visualstudio.com/)) with TypeScript
   ([www.typescriptlang.org](https://www.typescriptlang.org/)) support installed on your
   maschine to edit and build the code. You can use the
   following guide:
   [code.visualstudio.com/Docs/languages/typescript](https://code.visualstudio.com/Docs/languages/typescript)

1. Clone the repository recursively:

   ```bash
   git clone --recursive https://github.com/YertleTurtleGit/material-scanner
   ```

2. Open
   ['material-scanner.code-workspace'](material-scanner.code-workspace)
   as workspace in Visual Studio Code.

3. Run the configured build on file change task by clicking
   ctrl+shift+b.

4. Press F5 to run the application in the chromium web
   browser. You may have to configure the
   ['launch.json'](.vscode/launch.json) file to fit your
   setup. Alternatively you can open your preferred web
   browser and open the ['index.html'](index.html) file.

## Input

### Images

<div align="left">
    <img src="./test_dataset/object1/object1_000_036.jpg" width="24%">
    <img src="./test_dataset/object1/object1_045_036.jpg" width="24%">
    <img src="./test_dataset/object1/object1_090_036.jpg" width="24%">
    <img src="./test_dataset/object1/object1_135_036.jpg" width="24%">
    <img src="./test_dataset/object1/object1_180_036.jpg" width="24%">
    <img src="./test_dataset/object1/object1_225_036.jpg" width="24%">
    <img src="./test_dataset/object1/object1_270_036.jpg" width="24%">
    <img src="./test_dataset/object1/object1_315_036.jpg" width="24%">
</div>

## Output

### Normal Mapping

<div align="left">
    <img src="./doc/normal-mapping.jpg" width="50%">
</div>

### Point Cloud

<div align="left">
    <img src="./doc/point-cloud.gif" width="50%">
</div>
