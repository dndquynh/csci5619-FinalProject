# Final Project

**Due: Friday, December 18, 10:00pm CDT**

This project allows users to create a Christmas themed scene by using their Oculus Quest controllers to draw a variety of objects on a canvas in the virtual environment, which the "Medium" software ( medium.com/tensorflow/train-on-google-colab-and-run-on-the-browser-a-case-study-8a45f9b1474e) this project is built upon then uses to predict which mesh the user wanted to draw. After confirming that this predictiotion is correct, this mesh is then placed in the scene.


Name: Kathryn Altpeter, Quynh Do

UMN Email:

Build URL:

Third Party Assets: Cat Model: https://sketchfab.com/3d-models/sleeping-cat-3f7608e2b6b248bf83db09fb21125c2b
					Star Model: https://sketchfab.com/3d-models/star-630cd2c1dbcf486da2777244300fed5b
					Table Model: https://sketchfab.com/3d-models/low-poly-table-d33bd88ed7f146669129d253593e7aee
					Flower Model:https://sketchfab.com/3d-models/low-poly-flowers-857802babfd542e094e8ef2c396be360
                                        Ice Cream Model: https://sketchfab.com/3d-models/icecream-low-poly-game-ready-5736985d6deb4af0a4e2c0ba885f72f8
                                        Snowflake: https://sketchfab.com/3d-models/snowflake-5cb68fa2bd1a43eca4f0fc7f5c676a8d
                                        Snowman: https://sketchfab.com/3d-models/low-poly-snowman-d717ec46652147989c5b90a3a9a0bc6a
                                        Cookie: https://sketchfab.com/3d-models/cookie-34e918d15a9d4fe9bb85bcf72c396191
                                        Crown: https://clara.io/view/76586211-ecd9-4ba6-a1ba-7aa95c242b3a#
                                        Bear: https://clara.io/view/d9f1b4f8-d8c7-48e5-bf66-212c8f23c291#
                                        Broom: https://sketchfab.com/3d-models/witches-broom-f0512795f99446739905a8f6e41b837c
                                        Tree: https://sketchfab.com/3d-models/my-first-christmas-tree-low-poly-bd6814852a314ecab4320232844de1d5
                                        TensorFlow.js: https://www.tensorflow.org/js/
                                        Medium (drawing recognition software): medium.com/tensorflow/train-on-google-colab-and-run-on-the-browser-a-case-study-8a45f9b1474e

Make sure to document all third party assets. ***Be aware that points will be deducted for using third party assets that are not properly documented.***


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

This assignment was partially based upon content from the [3D User Interfaces Fall 2020](https://github.blairmacintyre.me/3dui-class-f20) course by Blair MacIntyre and was inspired by the [Making Beat Saber in 10 Minutes](https://www.youtube.com/watch?v=gh4k0Q1Pl7E) video on YouTube.

The included example music is "Hyperspace - Lightyears Away" from the [Star Control 2 Music Remix Project](http://www.medievalfuture.com/precursors/music.php).

