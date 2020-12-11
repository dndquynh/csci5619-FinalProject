/* CSCI 5619 Assignment 5, Fall 2020
 * Author: Evan Suma Rosenberg
 * License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 */

import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3, Color3, Matrix, Vector2 } from "@babylonjs/core/Maths/math";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { WebXRInputSource } from "@babylonjs/core/XR/webXRInputSource";
import { WebXRCamera } from "@babylonjs/core/XR/webXRCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { MeshBuilder } from  "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial} from "@babylonjs/core/Materials/standardMaterial";
import { Logger } from "@babylonjs/core/Misc/logger";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import {DynamicTexture, LinesMesh, Mesh, Ray} from "@babylonjs/core";
import { AssetsManager } from "@babylonjs/core/Misc/assetsManager";
import { GUI3DManager } from "@babylonjs/gui/3D/gui3DManager"
import { Button3D } from "@babylonjs/gui/3D/controls/button3D"
import { HolographicButton } from "@babylonjs/gui/3D/controls/holographicButton"
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock"

// Side effects
import "@babylonjs/core/Helpers/sceneHelpers";
import "@babylonjs/loaders/OBJ/objFileLoader"
import "@babylonjs/loaders/glTF/2.0/glTFLoader"

// Import debug layer
import "@babylonjs/inspector";
import { WebXRControllerComponent } from "@babylonjs/core/XR/motionController";

import * as tf from '@tensorflow/tfjs';
import { LayersModel } from "@tensorflow/tfjs";



/******* Start of the Game class ******/
class Game
{
    private canvas: HTMLCanvasElement;
    private engine: Engine;
    private scene: Scene;

    private xrCamera: WebXRCamera | null;
    private leftController: WebXRInputSource | null;
    private rightController: WebXRInputSource | null;

	private drawingCanvas: Mesh | null;
    private worldNode: TransformNode | null;
    private dynamicTexture: DynamicTexture | null;
    private ctx: CanvasRenderingContext2D | null;
    private painting: Boolean;

    private laserPointer: LinesMesh | null;

    private model: LayersModel | null;
    private points: Array<Vector2>;
    private objectNames: Array<String>;

    constructor()
    {
        // Get the canvas element
        this.canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

        // Generate the BABYLON 3D engine
        this.engine = new Engine(this.canvas, true);

        // Creates a basic Babylon Scene object
        this.scene = new Scene(this.engine);

        // Initialize XR member variables to null
        this.xrCamera = null;
        this.leftController = null;
        this.rightController = null;
		this.drawingCanvas = null;
        this.worldNode = null;
        this.laserPointer = null;
        this.dynamicTexture = null;
        this.ctx = null;

        this.painting = false;

        // ML
        this.model = null;
        this.points = [];
        this.objectNames = ['table',  'star', 'flower', 'circle', 'cat']
    }

    start() : void
    {
        // Create the scene and then execute this function afterwards
        this.createScene().then(() => {

            // Register a render loop to repeatedly render the scene
            this.engine.runRenderLoop(() => {
                this.update();
                this.scene.render();
            });

            // Watch for browser/canvas resize events
            window.addEventListener("resize", () => {
                this.engine.resize();
            });
        });
    }

    private async createScene()
    {
        // This creates and positions a first-person camera (non-mesh)
        var camera = new UniversalCamera("camera1", new Vector3(0, 1.6, 0), this.scene);
        camera.fov = 90 * Math.PI / 180;
        camera.minZ = .1;
        camera.maxZ = 100;

        // This attaches the camera to the canvas
        camera.attachControl(this.canvas, true);

        // Creates the XR experience helper
        const xrHelper = await this.scene.createDefaultXRExperienceAsync({});

        // Disable teleportation and the laser pointer
        xrHelper.teleportation.dispose();
        // xrHelper.pointerSelection.dispose();

        // Assign the xrCamera to a member variable
        this.xrCamera = xrHelper.baseExperience.camera;

        // Create points for the laser pointer
        var laserPoints = [];
        laserPoints.push(new Vector3(0, 0, 0));
        laserPoints.push(new Vector3(0, 0, 10));

        // Create a laser pointer and make sure it is not pickable
        this.laserPointer = MeshBuilder.CreateLines("laserPointer", {points: laserPoints}, this.scene);
        this.laserPointer.color = Color3.Blue();
        this.laserPointer.alpha = .5;
        this.laserPointer.visibility = 0;
        this.laserPointer.isPickable = false;

		this.worldNode = new TransformNode("world node");
        this.worldNode.position =  this.xrCamera.position;
		this.worldNode.setParent(this.xrCamera);

		var plane = MeshBuilder.CreatePlane("plane", {size:2}, this.scene);
        plane.position = new Vector3(0, 1.6, 5);
        plane.isPickable = true;
		this.drawingCanvas = plane;
        this.drawingCanvas.setParent(this.worldNode);
        this.drawingCanvas.position.y = -1;

        // Dynamic texture for drawing canvas
        this.dynamicTexture = new DynamicTexture("dynamic texture", {width: 300, height: 300}, this.scene, false);
        var canvasMaterial = new StandardMaterial("canvas material", this.scene);
        canvasMaterial.diffuseTexture = this.dynamicTexture;
        this.drawingCanvas.material = canvasMaterial;
        canvasMaterial.emissiveColor = Color3.White();

        this.ctx = this.dynamicTexture.getContext();
        plane.enableEdgesRendering();

        // Assigns the controllers
        xrHelper.input.onControllerAddedObservable.add((inputSource) =>
        {
            if(inputSource.uniqueId.endsWith("left"))
            {
                this.leftController = inputSource;
                this.laserPointer!.parent = this.leftController.pointer;
                this.laserPointer!.visibility = 1;
            }
            else
            {
                this.rightController = inputSource;
				this.laserPointer!.parent = this.rightController.pointer;
                this.laserPointer!.visibility = 1;
            }
        });

        // Don't forget to deparent the laser pointer or it will be destroyed!
        xrHelper.input.onControllerRemovedObservable.add((inputSource) => {

            if(inputSource.uniqueId.endsWith("right"))
            {
				this.laserPointer!.parent = null;
                this.laserPointer!.visibility = 0;
                // this.laserPointer!.parent = null;
                // this.laserPointer!.visibility = 0;
            }
            if (inputSource.uniqueId.endsWith("left")) {
                this.laserPointer!.parent = null;
                this.laserPointer!.visibility = 0;
            }
        });

		 var assetsManager = new AssetsManager(this.scene);
        // Creates a default skybox
        const environment = this.scene.createDefaultEnvironment({
            createGround: true,
            groundSize: 50,
            skyboxSize: 50,
            skyboxColor: new Color3(0, 0, 0)
        });
         assetsManager.load();

        // The manager automates some of the GUI creation steps
        var guiManager = new GUI3DManager(this.scene);

        // Create a test button
        var testButton = new Button3D("testButton");
        guiManager.addControl(testButton);

        // This must be done after addControl to overwrite the default content
        testButton.position = new Vector3(0, 1.6, 3);
        testButton.scaling.y = .5;

        // Link a transform node so we can move the button around
        var testButtonTransform = new TransformNode("testButtonTransform", this.scene);
        testButtonTransform.rotation.y = 15 * Math.PI / 180;
        testButton.linkToTransformNode(testButtonTransform);

        // Create the test button text
        var testButtonText = new TextBlock();
        testButtonText.text = "Predict";
        testButtonText.color = "white";
        testButtonText.fontSize = 24;
        testButtonText.scaleY = 2;
        testButton.content = testButtonText;


        // Type cast the button material so we can change the color
        var testButtonMaterial = <StandardMaterial>testButton.mesh!.material;

        // Custom background color
        var backgroundColor = new Color3(.284, .73, .831);
        testButtonMaterial.diffuseColor = backgroundColor;
        testButton.pointerOutAnimation = () => {
            testButtonMaterial.diffuseColor = backgroundColor;
        }

        // Custom hover color
        var hoverColor = new Color3(.752, .53, .735);
        testButton.pointerEnterAnimation = () => {
            testButtonMaterial.diffuseColor = hoverColor;
        }

        //  Make prediction
        testButton.onPointerDownObservable.add(() => {
            this.predictResult();
        });
        // Make sure the environment and skybox is not pickable!
        environment!.ground!.isPickable = false;
        environment!.skybox!.isPickable = false;

        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        var light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);

        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 0.7;

        // Show the debug layer
        this.scene.debugLayer.show();

        // Load tensorflow model
        this.model = await tf.loadLayersModel('ML/model/model.json');
    }

    private draw(posX: number, posY: number) {
        console.log(posX, posY);
        if (!this.painting) return;
        Logger.Log("drawing");
        this.ctx!.strokeStyle = "red";
        this.ctx!.lineWidth = 10;
        this.ctx!.lineCap = "round";
        this.ctx!.lineTo(posX, posY);
        this.ctx!.stroke();
        this.ctx!.beginPath();
        this.ctx!.moveTo(posX, posY);
        this.dynamicTexture!.update();
    }

    // https://github.com/zaidalyafeai/zaidalyafeai.github.io/blob/master/sketcher/main.js
    private getBoundingBox() {
        //get coordinates
        var coorX = this.points.map(function(p) {
            return p.x
        });
        var coorY = this.points.map(function(p) {
            return p.y
        });

        //find top left and bottom right corners
        var min_coords = {
            x: Math.min.apply(null, coorX),
            y: Math.min.apply(null, coorY)
        }
        var max_coords = {
            x: Math.max.apply(null, coorX),
            y: Math.max.apply(null, coorY)
        }

        //return as struct
        return {
            min: min_coords,
            max: max_coords
        }
    }

    private getImageData() {
        //get the minimum bounding box around the drawing
        const minBoundingBox = this.getBoundingBox()

        //get image data according to dpi
        const dpi = window.devicePixelRatio
        const imgData = this.ctx!.getImageData(minBoundingBox.min.x * dpi, minBoundingBox.min.y * dpi,
                                                      (minBoundingBox.max.x - minBoundingBox.min.x) * dpi, (minBoundingBox.max.y - minBoundingBox.min.y) * dpi);
        return imgData
    }

    private preprocess(imgData: ImageData) {
        return tf.tidy(() => {
            //convert to a tensor
            let tensor = tf.browser.fromPixels(imgData, 1)

            //resize
            const resized = tf.image.resizeBilinear(tensor, [28, 28]).toFloat()

            //normalize
            const offset = tf.scalar(255.0);
            const normalized = tf.scalar(1.0).sub(resized.div(offset));

            //We add a dimension to get a batch shape
            const batched = normalized.expandDims(0)
            return batched
        })
    }

    private predictResult() {
        //make sure we have at least two recorded coordinates
        if (this.points.length >= 2) {

            //get the image data from the canvas
            const imgData = this.getImageData()

            //get the prediction
            const pred = (<tf.Tensor>this.model!.predict(this.preprocess(imgData))).dataSync()

            var maxIndex = 0;
            for (var i = 0; i < pred.length; i++) {
                if (pred[i] > pred[maxIndex]) {
                    maxIndex = i;
                }
            }
            console.log(this.objectNames[maxIndex]);
            return this.objectNames[maxIndex];
        } else {
            console.log("Not enough data");
            return;
        }
    }


    // The main update loop will be executed once per frame before the scene is rendered
    private update() : void
    {
      this.processControllerInput();
    }

    private processControllerInput()
    {
        this.onLeftTrigger(this.leftController?.motionController?.getComponent("xr-standard-trigger"));
        this.onRightTrigger(this.rightController?.motionController?.getComponent("xr-standard-trigger"));
    }

    private onLeftTrigger(component?: WebXRControllerComponent)
    {
        if (component?.pressed)
        {
            Logger.Log("left trigger pressed");
            this.laserPointer!.color = Color3.Green();

            var ray = new Ray(this.leftController!.pointer.position, this.leftController!.pointer.forward, 10);
            var pickInfo = this.scene.pickWithRay(ray);
            console.log(pickInfo);

            if (pickInfo?.hit) {
                Logger.Log(pickInfo!.pickedMesh!.name);
                if (pickInfo!.pickedMesh && pickInfo!.pickedMesh!.name == "plane") {
                    Logger.Log("ray hit canvas");
                    if (!this.painting) {
                        this.painting = true;
                    }

                    var canvasPos = this.drawingCanvas!.getAbsolutePosition();
                    var pickPos = pickInfo!.pickedPoint;
                    var drawingPos = pickPos!.subtract(canvasPos);
                    console.log("draw" + drawingPos);

                    // Convert to the drawing canvas local space
                    var m = new Matrix();
                    this.drawingCanvas?.getWorldMatrix().invertToRef(m);
                    canvasPos = Vector3.TransformCoordinates(canvasPos, m);
                    pickPos = Vector3.TransformCoordinates(pickPos!, m);
                    drawingPos = pickPos!.subtract(canvasPos);
                    console.log('canvas' + canvasPos);
                    console.log('picked' + pickPos);
                    console.log("draw" + drawingPos);

                    this.draw(drawingPos.x * 150 + 150, -drawingPos.y * 150 + 150);
                    this.points.push(new Vector2(drawingPos.x * 150 + 150, -drawingPos.y * 150 + 150));
                } else {
                    this.painting = false;
                    this.ctx!.beginPath();
                }
            }
        }
        else
        {
            this.painting = false;
            this.ctx!.beginPath();
        }
    }

    private onRightTrigger(component?: WebXRControllerComponent)
    {
          if(component?.pressed)
          {
                // Logger.Log("right trigger pressed");
                this.laserPointer!.color = Color3.Blue();
                this.laserPointer!.parent = this.rightController!.pointer;

            var ray = new Ray(this.rightController!.pointer.position, this.rightController!.pointer.forward, 10);
            var pickInfo = this.scene.pickWithRay(ray);
            console.log(pickInfo);

            if (pickInfo?.hit) {
                Logger.Log(pickInfo!.pickedMesh!.name);
                if (pickInfo!.pickedMesh && pickInfo!.pickedMesh!.name == "plane") {
                    Logger.Log("ray hit canvas");
                    if (!this.painting) {
                        this.painting = true;
                    }

                    var canvasPos = this.drawingCanvas!.getAbsolutePosition();
                    var pickPos = pickInfo!.pickedPoint;
                    var drawingPos = pickPos!.subtract(canvasPos);
                    console.log("draw" + drawingPos);

                    // Convert to the drawing canvas local space
                    var m = new Matrix();
                    this.drawingCanvas?.getWorldMatrix().invertToRef(m);
                    canvasPos = Vector3.TransformCoordinates(canvasPos, m);
                    pickPos = Vector3.TransformCoordinates(pickPos!, m);
                    drawingPos = pickPos!.subtract(canvasPos);
                    console.log('canvas' + canvasPos);
                    console.log('picked' + pickPos);
                    console.log("draw" + drawingPos);

                    this.draw(drawingPos.x * 150 + 150, -drawingPos.y * 150 + 150);
                    this.points.push(new Vector2(drawingPos.x * 150 + 150, -drawingPos.y * 150 + 150));
                 } else {
                    this.painting = false;
                    this.ctx!.beginPath();
                }
              }
              else if (pickInfo!.pickedMesh && pickInfo!.pickedMesh!.name == "testButton_rootMesh") {
                  this.predictResult();
              }
            }
       else
       {
		//   Logger.Log("right trigger released");
		  this.painting = false;
          this.ctx!.beginPath();
       }
    }
}
/******* End of the Game class ******/

// start the game
var game = new Game();
game.start();