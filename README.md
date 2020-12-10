# Material Scanner

Live demo: https://yertleturtlegit.github.io/material-scanner/

## Test-Dataset

The following test-dataset is used:

<div align="center">
    <img src="./test_dataset/object1/object1_000_036.jpg" width="24%">
    <img src="./test_dataset/object1/object1_045_036.jpg" width="24%">
    <img src="./test_dataset/object1/object1_090_036.jpg" width="24%">
    <img src="./test_dataset/object1/object1_135_036.jpg" width="24%">
    <img src="./test_dataset/object1/object1_180_036.jpg" width="24%">
    <img src="./test_dataset/object1/object1_225_036.jpg" width="24%">
    <img src="./test_dataset/object1/object1_270_036.jpg" width="24%">
    <img src="./test_dataset/object1/object1_315_036.jpg" width="24%">
</div>

## Normal Mapping

<div align="center">
    <img src="./doc_images/normal-map.gif" width="49%">
    <img src="./doc_images/normal-map_cropped.gif" width="49%">
    </br>
    <p style="float: left; width: 50%; font-style: italic">Point cloud with mapped normals of all image data.</p>
    <p style="float: left; width: 50%; font-style: italic">Point cloud with mapped normals of cropped image data.</p>
</div>

## Error-Proneness Mapping

An error-proneness calculated on the basis of the difference
between opposite _Riemann sums_ is color-coded relatively
per point cloud. Green symbolizes low and red symbolizes
high error-proneness.

<div align="center">
    <img src="./doc_images/error-proneness.gif" width="49%">
    <img src="./doc_images/error-proneness_cropped.gif" width="49%">
    </br>
    <p style="float: left; width: 50%; font-style: italic">Point cloud with mapped error-proneness of all image data.</p>
    <p style="float: left; width: 50%; font-style: italic">Point cloud with mapped error-proneness of cropped image data.</p>
</div>
