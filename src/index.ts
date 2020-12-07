/* CSCI 5619 Assignment 5, Fall 2020
 * Author: Evan Suma Rosenberg
 * License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 */

import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3, Color3, Matrix } from "@babylonjs/core/Maths/math";
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

// Side effects
import "@babylonjs/core/Helpers/sceneHelpers";
import "@babylonjs/loaders/OBJ/objFileLoader"
import "@babylonjs/loaders/glTF/2.0/glTFLoader"

// Import debug layer
import "@babylonjs/inspector";
import { WebXRControllerComponent } from "@babylonjs/core/XR/motionController";


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
        xrHelper.pointerSelection.dispose();

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
		
		/* var sphere = MeshBuilder.CreateSphere("sphere", {diameter: 0.5, segments: 32}, this.scene);
		sphere.position = new Vector3(0, 1.6, 5);
		sphere.setParent(this.worldNode);*/
		

		var sphere = MeshBuilder.CreateSphere("sphere", {diameter: 0.5, segments: 32}, this.scene);
		sphere.position = new Vector3(0, 1.6, 3);
		sphere.setParent(this.worldNode);

		var plane = MeshBuilder.CreatePlane("plane", {size:2}, this.scene);
        plane.position = new Vector3(0, 1.6, 5);
        plane.isPickable = true;
		this.drawingCanvas = plane;
        this.drawingCanvas.setParent(this.worldNode);

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
            }
        });

        // Don't forget to deparent the laser pointer or it will be destroyed!
        xrHelper.input.onControllerRemovedObservable.add((inputSource) => {

            if(inputSource.uniqueId.endsWith("right"))
            {
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
        // Make sure the environment and skybox is not pickable!
        environment!.ground!.isPickable = false;
        environment!.skybox!.isPickable = false;

        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        var light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);

        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 0.7;

        // Show the debug layer
        this.scene.debugLayer.show();
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
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
                Logger.Log("right trigger pressed");
            }
            else
            {
                Logger.Log("right trigger released");
            }
        }
    }

}
/******* End of the Game class ******/

// start the game
var game = new Game();
game.start();