# Final Project

**Due: Friday, December 18, 10:00pm CDT**


This project allows users to create a Christmas themed scene by using their Oculus Quest controllers to draw a variety of objects on a canvas in the virtual environment. The machine learning model was written following a tutorial blog on Medium (medium.com/tensorflow/train-on-google-colab-and-run-on-the-browser-a-case-study-8a45f9b1474e). The model was written in Python and trained on Google Colab, and then converted to TensorFlow.js to use in our project. The model would predict which mesh the user wanted to draw. After confirming that this prediction is correct, this mesh is then placed in the scene.


Name: Kathryn Altpeter, Quynh Do

UMN Email: doxxx211@umn.edu, altpe001@umn.edu

Build URL:

How to use:

#### Draw an object
Use the ray cast to draw on the white canvas, hold the trigger button to draw, you can use either left or right controller. You could draw any objects in this list: snowman, lollipop, table, circle, snowflake, crown, cookie, star, ice_cream, candle, sock, tree, flower, broom, bear.

#### Redrawing
If any time you need to redraw the object, click the "Clear" button to clear the canvas and start again.

#### Predicting and creating the object
Click the "Predict" button when you finish drawing. If the prediction is correct, press the "Confirm" button to create and add the 3D model to the scene.

#### Moving the object
Point the laser pointer to the object you want to move, and press and hold the squeeze button to move it around. You can use the thumbstick to move it in and out, and rotate the controller to rotate it.

#### Delete an object
Grab the object you want to delete, while grabbing them, use the other controller and click the "Delete" button (using the trigger button) to dispose the object from the scene.


Third Party Assets:
* Cat Model: https://sketchfab.com/3d-models/sleeping-cat-3f7608e2b6b248bf83db09fb21125c2b
* Star Model: https://sketchfab.com/3d-models/star-630cd2c1dbcf486da2777244300fed5b
* Table Model: https://sketchfab.com/3d-models/low-poly-table-d33bd88ed7f146669129d253593e7aee
* Flower Model:https://sketchfab.com/3d-models/low-poly-flowers-857802babfd542e094e8ef2c396be360
* Ice Cream Model: https://sketchfab.com/3d-models/icecream-low-poly-game-ready-5736985d6deb4af0a4e2c0ba885f72f8
* Snowflake: https://sketchfab.com/3d-models/snowflake-5cb68fa2bd1a43eca4f0fc7f5c676a8d
* Cookie: https://assetstore.unity.com/packages/3d/props/food/christmas-cookies-breakable-105913
* Crown: https://clara.io/view/76586211-ecd9-4ba6-a1ba-7aa95c242b3a#
* Bear: https://assetstore.unity.com/packages/3d/props/free-christmas-presents-low-poly-24356
* Broom: https://assetstore.unity.com/packages/3d/environments/fantasy/free-cartoon-halloween-pack-mobile-vr-45896
* Tree: https://sketchfab.com/3d-models/my-first-christmas-tree-low-poly-bd6814852a314ecab4320232844de1d5
* Candy cane: https://assetstore.unity.com/packages/3d/props/free-christmas-assets-low-poly-13102
* Candle, sock, snowman: https://assetstore.unity.com/packages/3d/props/interior/christmas-toys-106607
* TensorFlow.js: https://www.tensorflow.org/js/
* Drawing recognition model tutorial:

    * Blog post: medium.com/tensorflow/train-on-google-colab-and-run-on-the-browser-a-case-study-8a45f9b1474e
    * Github code for image processing and predicting (lines 669 - 748 in our code, including these functions: getBoundingBox(), getImageData(), preprocess(), predictResult()): https://github.com/zaidalyafeai/zaidalyafeai.github.io/blob/master/sketcher/main.js
    * We tweak the functions a bit to make it work with our code, however, the main parts are from the tutorial.
* Dataset used to train the model: https://github.com/googlecreativelab/quickdraw-dataset

Make sure to document all third party assets.

***Be aware that points will be deducted for using third party assets that are not properly documented.***


## Local Development

After checking out the project, you need to initialize by pulling the dependencies with:

```
npm install
```

If TensorFlow has not been previously installed on your computer, then install TensorFlow.js onto you computer from https://www.tensorflow.org/js/, and initialize it using:

```
npm install @tensorflow/tfjs
```

After that, you can compile and run a server with:

```
npm run start
```

Under the hood, we are using the `npx` command to both build the project (with webpack) and run a local http webserver on your machine.  The included ```package.json``` file is set up to do this automatically.  You do not have to run ```tsc``` to compile the .js files from the .ts files;  ```npx``` builds them on the fly as part of running webpack.

You can run the program by pointing your web browser at ```https://your-local-ip-address:8080```.

## License

Material for [CSCI 5619 Fall 2020](https://canvas.umn.edu/courses/194179) by [Quynh Do and Kathryn Altpeter] is licensed under a [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License](http://creativecommons.org/licenses/by-nc-sa/4.0/).

The intent of choosing CC BY-NC-SA 4.0 is to allow individuals and instructors at non-profit entities to use this content.  This includes not-for-profit schools (K-12 and post-secondary). For-profit entities (or people creating courses for those sites) may not use this content without permission (this includes, but is not limited to, for-profit schools and universities and commercial education sites such as Coursera, Udacity, LinkedIn Learning, and other similar sites).

## Acknowledgments

The initial inspiration for this idea can be found here: https://stackoverflow.com/questions/37943753/best-approach-for-2d-gesture-recognition-in-vr.