/* CSCI 5619 Assignment 5, Fall 2020
 * Author: Evan Suma Rosenberg
 * License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 */

import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3, Color3 } from "@babylonjs/core/Maths/math";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { WebXRInputSource } from "@babylonjs/core/XR/webXRInputSource";
import { WebXRCamera } from "@babylonjs/core/XR/webXRCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { MeshBuilder } from  "@babylonjs/core/Meshes/meshBuilder";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { StandardMaterial} from "@babylonjs/core/Materials/standardMaterial";
import { Logger } from "@babylonjs/core/Misc/logger";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import {Mesh} from "@babylonjs/core";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
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
		
		this.worldNode = new TransformNode("world node");
        this.worldNode.position =  this.xrCamera.position;
		this.worldNode.setParent(this.xrCamera);
		
		 var sphere = MeshBuilder.CreateSphere("sphere", {diameter: 0.5, segments: 32}, this.scene);
		sphere.position = new Vector3(0, 1.6, 5);
		sphere.setParent(this.worldNode);
		
		
		var plane = MeshBuilder.CreatePlane("plane", {size:2}, this.scene);
		plane.position = new Vector3(0, 1.6, 5);
		this.drawingCanvas = plane;
		this.drawingCanvas.setParent(this.worldNode);
        // Assigns the controllers
        xrHelper.input.onControllerAddedObservable.add((inputSource) =>
        {
            if(inputSource.uniqueId.endsWith("left"))
            {
                this.leftController = inputSource;
            }
            else
            {
                this.rightController = inputSource;
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
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
                Logger.Log("left trigger pressed");
            }
            else
            {
                Logger.Log("left trigger released");
            }
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