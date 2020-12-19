/* CSCI 5619 Final, Fall 2020
 * Author: Evan Suma Rosenberg
 * License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 */

import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3, Color3, Matrix, Vector2, Space} from "@babylonjs/core/Maths/math";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { WebXRInputSource } from "@babylonjs/core/XR/webXRInputSource";
import { WebXRCamera } from "@babylonjs/core/XR/webXRCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { MeshBuilder } from  "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial} from "@babylonjs/core/Materials/standardMaterial";
import { Logger } from "@babylonjs/core/Misc/logger";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import {DynamicTexture, LinesMesh, Mesh, PBRMaterial, Ray, Texture} from "@babylonjs/core";
import { AssetsManager } from "@babylonjs/core/Misc/assetsManager";
import { Quaternion } from "@babylonjs/core/Maths/math.vector";
import { GUI3DManager } from "@babylonjs/gui/3D/gui3DManager"
import { Button3D } from "@babylonjs/gui/3D/controls/button3D"
import { TextBlock } from "@babylonjs/gui/2D/controls/textBlock"
import { AdvancedDynamicTexture } from "@babylonjs/gui/2D/advancedDynamicTexture"
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";


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
	private currentResult: string;
    private points: Array<Vector2>;
    private objectNames: Array<string>;
    private posX: number;
    private posY: number;
    private textBlock: TextBlock | null;
    private predictableMeshes: Array<AbstractMesh>;
	private count: number;
	private rightGrabbedObject: AbstractMesh | null;
	private leftGrabbedObject: AbstractMesh | null;
    private grabbableObjects: Array<AbstractMesh>;
	private prevCameraPos: Vector3;

	private selectedObjectL: AbstractMesh | null;
    private selectionTransformL: TransformNode | null;

	private selectedObjectR: AbstractMesh | null;
    private selectionTransformR: TransformNode | null;




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
        this.posX = 0;
        this.posY = 0;

        // ML
		this.currentResult = "";
        this.model = null;
        this.points = [];
        // this.objectNames = ['flower', 'ice_cream', 'table', 'circle', 'star']
        this.objectNames = ['snowman', 'lollipop', 'table', 'circle', 'snowflake', 'crown', 'cookie', 'star', 'ice_cream', 'candle', 'sock', 'tree', 'flower', 'broom', 'bear'];
        this.textBlock = null;
		this.predictableMeshes = [];
		this.count = 0;
		this.rightGrabbedObject = null;
		this.leftGrabbedObject = null;
        this.grabbableObjects = [];
		this.prevCameraPos = new Vector3(0,0,0);

		this.selectedObjectL = null;
        this.selectionTransformL = null;

		this.selectedObjectR = null;
        this.selectionTransformR = null;
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
		this.worldNode.position.y = this.worldNode.position.y - 1;
		this.worldNode.setParent(this.xrCamera);

		var plane = MeshBuilder.CreatePlane("plane", {size:2}, this.scene);
        plane.position = new Vector3(0, 1.6, 5);
        plane.isPickable = true;
		this.drawingCanvas = plane;
        this.drawingCanvas.setParent(this.xrCamera);
        this.drawingCanvas.position.y = -0.6;

        // Dynamic texture for drawing canvas
        this.dynamicTexture = new DynamicTexture("dynamic texture", {width: 300, height: 300}, this.scene, false);
        var canvasMaterial = new StandardMaterial("canvas material", this.scene);
        canvasMaterial.diffuseTexture = this.dynamicTexture;
        this.drawingCanvas.material = canvasMaterial;
        canvasMaterial.emissiveColor = Color3.White();

        this.ctx = this.dynamicTexture.getContext();
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.dynamicTexture.update();
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

        this.selectionTransformL = new TransformNode("selectionTransformL", this.scene);
        this.selectionTransformL.parent = this.laserPointer;

		this.selectionTransformR = new TransformNode("selectionTransformR", this.scene);
        this.selectionTransformR.parent = this.laserPointer;

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

        /**************************************** LOADING ASSETS *******************************************/
        var worldTask = assetsManager.addMeshTask("world task", "", "assets/models/", "ice_cream.glb");
        worldTask.onSuccess = (task) => {
            worldTask.loadedMeshes[0].name = "ice_cream";
            worldTask.loadedMeshes[0].position = new Vector3(0, -2, 0);
			var meshRotation = Quaternion.FromEulerAngles(0, Math.PI, 0);
			if( worldTask.loadedMeshes[0].rotationQuaternion){
            worldTask.loadedMeshes[0].rotationQuaternion.multiplyInPlace(meshRotation);
			}
            worldTask.loadedMeshes[0].scaling = new Vector3(0.003,0.003,0.003);
            worldTask.loadedMeshes[0].setEnabled(false);
			this.predictableMeshes.push( worldTask.loadedMeshes[0]);
			this.grabbableObjects.push( worldTask.loadedMeshes[0]);
        }

		var worldTask2 = assetsManager.addMeshTask("world task", "", "assets/models/", "flower.glb");
        worldTask2.onSuccess = (task) => {
            worldTask2.loadedMeshes[0].name = "flower";
            worldTask2.loadedMeshes[0].position = new Vector3(0, -2, 0);
            worldTask2.loadedMeshes[0].rotation = Vector3.Zero();
            worldTask2.loadedMeshes[0].scaling = new Vector3(0.01,0.01,0.01);
            worldTask2.loadedMeshes[0].setEnabled(false);
			this.predictableMeshes.push( worldTask2.loadedMeshes[0]);
			this.grabbableObjects.push( worldTask2.loadedMeshes[0]);
        }

		var worldTask3 = assetsManager.addMeshTask("world task", "", "assets/models/", "star.glb");
        worldTask3.onSuccess = (task) => {
            worldTask3.loadedMeshes[0].name = "star";
            worldTask3.loadedMeshes[0].position = new Vector3(0, -2, 0);
			var meshRotation = Quaternion.FromEulerAngles(0, Math.PI / 2, 0);
           if( worldTask3.loadedMeshes[0].rotationQuaternion){
            worldTask3.loadedMeshes[0].rotationQuaternion.multiplyInPlace(meshRotation);
			}
            worldTask3.loadedMeshes[0].scaling = new Vector3(0.0005,0.0005,0.0005);
            worldTask3.loadedMeshes[0].setEnabled(false);
			this.predictableMeshes.push( worldTask3.loadedMeshes[0]);
			this.grabbableObjects.push( worldTask3.loadedMeshes[0]);
        }
		var worldTask4 = assetsManager.addMeshTask("world task", "", "assets/models/", "table.glb");
        worldTask4.onSuccess = (task) => {
            worldTask4.loadedMeshes[0].name = "table";
            worldTask4.loadedMeshes[0].position = new Vector3(0, -2, 0);
            var meshRotation = Quaternion.FromEulerAngles(0, Math.PI / 2, 0);
            if( worldTask4.loadedMeshes[0].rotationQuaternion){
            worldTask4.loadedMeshes[0].rotationQuaternion.multiplyInPlace(meshRotation);
			}
            worldTask4.loadedMeshes[0].scaling = new Vector3(0.1,0.1,0.1);
            worldTask4.loadedMeshes[0].setEnabled(false);
			this.predictableMeshes.push( worldTask4.loadedMeshes[0]);
			this.grabbableObjects.push( worldTask4.loadedMeshes[0]);
        }

        var worldTask5 = assetsManager.addMeshTask("world task", "", "assets/models/", "Candy-Cane.glb");
        worldTask5.onSuccess = (task) => {
            worldTask5.loadedMeshes[0].name = "lollipop";
            worldTask5.loadedMeshes[0].position = new Vector3(0, 1, 0);
            worldTask5.loadedMeshes[0].scaling = new Vector3(0.1, 0.1, 0.1);
            worldTask5.loadedMeshes.forEach(mesh => {
                if (mesh.name === "Candy-Cane") {
                    let candyTexture = new Texture("assets/textures/Candy-Cane-01-Color-Spec.png", this.scene);
                    let mat = <PBRMaterial> mesh.material;
                    mat.albedoTexture = candyTexture;
                    mesh.position = new Vector3(0,0,0);
                }
            })
            worldTask5.loadedMeshes[0].setEnabled(false);
			this.predictableMeshes.push( worldTask5.loadedMeshes[0]);
			this.grabbableObjects.push( worldTask5.loadedMeshes[0]);
        }
        var worldTask6 = assetsManager.addMeshTask("world task", "", "assets/models/", "ChristmasSock.glb");
        worldTask6.onSuccess = (task) => {
            worldTask6.loadedMeshes[0].name = "sock";
            worldTask6.loadedMeshes[0].position = new Vector3(0, 1, 0);
            worldTask6.loadedMeshes.forEach(mesh => {
                if (mesh.name === "ChristmasSock") {
                    let sockTexture = new Texture("assets/textures/Candie_Sock_a.png", this.scene, undefined, false);
                    let mat = <PBRMaterial> mesh.material;
                    mat.albedoTexture = sockTexture;
                    mesh.position = new Vector3(0,0,0);
                }
            })
            worldTask6.loadedMeshes[0].setEnabled(false);
			this.predictableMeshes.push( worldTask6.loadedMeshes[0]);
			this.grabbableObjects.push( worldTask6.loadedMeshes[0]);
        }
        var worldTask7 = assetsManager.addMeshTask("world task", "", "assets/models/", "Candle_Small.glb");
        worldTask7.onSuccess = (task) => {
            worldTask7.loadedMeshes[0].name = "candle";
            worldTask7.loadedMeshes[0].position = new Vector3(0, 1, 0);
            worldTask7.loadedMeshes.forEach(mesh => {
                if (mesh.name === "Candle_Small") {
                    let candleATexture = new Texture("assets/textures/Candle_a.png", this.scene, undefined, false);
                    let candleAOTexture = new Texture("assets/textures/Candle_ao.png", this.scene, undefined, false);
                    let candleNTexture = new Texture("assets/textures/Candle_n.png", this.scene, undefined, false);
                    let mat = <PBRMaterial> mesh.material;
                    mat.albedoTexture = candleATexture;
                    mat.bumpTexture = candleNTexture;
                    mat.ambientTexture = candleAOTexture;
                }
            })
            worldTask7.loadedMeshes[0].setEnabled(false);
			this.predictableMeshes.push( worldTask7.loadedMeshes[0]);
			this.grabbableObjects.push( worldTask7.loadedMeshes[0]);
        }
        // bear too small
        var worldTask8 = assetsManager.addMeshTask("world task", "", "assets/models/", "Teddybear.glb");
        worldTask8.onSuccess = (task) => {
            worldTask8.loadedMeshes[0].name = "bear";
            worldTask8.loadedMeshes[0].position = new Vector3(0, 1, 0);
            worldTask8.loadedMeshes[0].scaling = new Vector3(0.05, 0.05, 0.05);
            worldTask8.loadedMeshes.forEach(mesh => {
                if (mesh.name === "Teddybear") {
                    let bearTexture = new Texture("assets/textures/Christmas-Presents-01.png", this.scene, undefined, false);
                    let mat = <PBRMaterial> mesh.material;
                    mat.albedoTexture = bearTexture;
                }
            })
            worldTask8.loadedMeshes[0].setEnabled(false);
			this.predictableMeshes.push(worldTask8.loadedMeshes[0]);
			this.grabbableObjects.push(worldTask8.loadedMeshes[0]);
        }
        var worldTask9 = assetsManager.addMeshTask("world task", "", "assets/models/", "tree.glb");
        worldTask9.onSuccess = (task) => {
            worldTask9.loadedMeshes[0].name = "tree";
            worldTask9.loadedMeshes[0].position = new Vector3(3, -0.5, 0);
            worldTask9.loadedMeshes[0].scaling = new Vector3(0.0035, 0.0035, 0.0035);
            worldTask9.loadedMeshes.forEach(mesh => {
                if (mesh.name === "Branch_Branch_0" || mesh.name === "Tree_Tree_0") {
                    mesh.isPickable = false;
                }
            })
        }

        var worldTask10 = assetsManager.addMeshTask("world task", "", "assets/models/", "snowflake.glb");
        worldTask10.onSuccess = (task) => {
            worldTask10.loadedMeshes[0].name = "snowflake";
            worldTask10.loadedMeshes[0].position = new Vector3(0, 1, 0);
            worldTask10.loadedMeshes[0].scaling = new Vector3(0.03, 0.03, 0.03);
            worldTask10.loadedMeshes[0].setEnabled(false);
			this.predictableMeshes.push( worldTask10.loadedMeshes[0]);
			this.grabbableObjects.push( worldTask10.loadedMeshes[0]);
        }

        var worldTask11 = assetsManager.addMeshTask("world task", "", "assets/models/", "Toy_Snowman.glb");
        worldTask11.onSuccess = (task) => {
            worldTask11.loadedMeshes[0].name = "snowman";
            worldTask11.loadedMeshes[0].position = new Vector3(0, 1, 0);
            worldTask11.loadedMeshes[0].scaling = new Vector3(5, 5, 5);
            worldTask11.loadedMeshes[0].rotationQuaternion =  Quaternion.FromEulerAngles(0, Math.PI, 0);
            worldTask11.loadedMeshes.forEach(mesh => {
                if (mesh.name === "Toy_Snowman") {
                    let snowmanATexture = new Texture("assets/textures/TreeToys_a.png", this.scene, undefined, false);
                    let snowmanAOTexture = new Texture("assets/textures/TreeToys_ao.png", this.scene, undefined, false);
                    let mat = <PBRMaterial> mesh.material;
                    mat.albedoTexture = snowmanATexture;
                    mat.ambientTexture = snowmanAOTexture;
                }
            })
            worldTask11.loadedMeshes[0].setEnabled(false);
			this.predictableMeshes.push( worldTask11.loadedMeshes[0]);
			this.grabbableObjects.push( worldTask11.loadedMeshes[0]);
        }

        var worldTask12 = assetsManager.addMeshTask("world task", "", "assets/models/", "crown.glb");
        worldTask12.onSuccess = (task) => {
            worldTask12.loadedMeshes[0].name = "crown";
            worldTask12.loadedMeshes[0].position = new Vector3(0, 1, 0);
            worldTask12.loadedMeshes[0].scaling = new Vector3(0.005, 0.005, 0.005);
            worldTask12.loadedMeshes[0].setEnabled(false);
			this.predictableMeshes.push( worldTask12.loadedMeshes[0]);
			this.grabbableObjects.push( worldTask12.loadedMeshes[0]);
        }
        var worldTask13 = assetsManager.addMeshTask("world task", "", "assets/models/", "WitchBroom.glb");
        worldTask13.onSuccess = (task) => {
            worldTask13.loadedMeshes[0].name = "broom";
            worldTask13.loadedMeshes[0].position = new Vector3(0, 1, 0);
            worldTask13.loadedMeshes[0].setEnabled(false);
			this.predictableMeshes.push( worldTask13.loadedMeshes[0]);
			this.grabbableObjects.push( worldTask13.loadedMeshes[0]);
        }

        var worldTask14 = assetsManager.addMeshTask("world task", "", "assets/models/", "Cookie_man.glb");
        worldTask14.onSuccess = (task) => {
            worldTask14.loadedMeshes[0].name = "cookie";
            worldTask14.loadedMeshes[0].position = new Vector3(0, 1, 0);
            worldTask14.loadedMeshes[0].rotationQuaternion = Quaternion.FromEulerAngles(-Math.PI / 2, 0, 0);
            worldTask14.loadedMeshes.forEach(mesh => {
                if (mesh.name === "Cookie_man") {
                    let cookieTexture = new Texture("assets/textures/Cookie_man.png", this.scene, undefined, false);
                    let mat = <PBRMaterial> mesh.material;
                    mat.albedoTexture = cookieTexture;
                }
            })
            worldTask14.loadedMeshes[0].setEnabled(false);
			this.predictableMeshes.push( worldTask14.loadedMeshes[0]);
			this.grabbableObjects.push( worldTask14.loadedMeshes[0]);
        }

        // Sphere smaller, maybe random color
		var sphereMaterial = new StandardMaterial("sphereMaterial", this.scene);
	    sphereMaterial.diffuseColor = new Color3(0, 1, 0);
	    var circle = MeshBuilder.CreateSphere("circle", {diameter: 1, segments: 32}, this.scene);
	    circle.material = sphereMaterial;
        circle.position = new Vector3(0, -2, 0);
        circle.scaling = new Vector3(0.15, 0.15, 0.15);
        circle.setEnabled(false);
		this.predictableMeshes.push(circle);
		this.grabbableObjects.push(circle);
        /**************************************** END ******************************************************/

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
        testButtonTransform.rotation.y = 45 * Math.PI / 180;
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
            this.currentResult = this.predictResult();
        });

		// Create a test button
        var confirmButton = new Button3D("confirmButton");
        guiManager.addControl(confirmButton);

        // This must be done after addControl to overwrite the default content
        confirmButton.position = new Vector3(0, 1.0, 3);
        confirmButton.scaling.y = .5;

        // Link a transform node so we can move the button around
        var confirmButtonTransform = new TransformNode("confirmButtonTransform", this.scene);
        confirmButtonTransform.rotation.y = 45 * Math.PI / 180;
        confirmButton.linkToTransformNode(confirmButtonTransform);

        // Create the test button text
        var confirmButtonText = new TextBlock();
        confirmButtonText.text = "Confirm";
        confirmButtonText.color = "white";
        confirmButtonText.fontSize = 24;
        confirmButtonText.scaleY = 2;
        confirmButton.content = confirmButtonText;


        // Type cast the button material so we can change the color
        var confirmButtonMaterial = <StandardMaterial>confirmButton.mesh!.material;

        // Custom background color
        var backgroundColor = new Color3(.284, .73, .831);
        confirmButtonMaterial.diffuseColor = backgroundColor;
        confirmButton.pointerOutAnimation = () => {
            confirmButtonMaterial.diffuseColor = backgroundColor;
        }

        // Custom hover color
        var hoverColor = new Color3(.752, .53, .735);
        confirmButton.pointerEnterAnimation = () => {
            confirmButtonMaterial.diffuseColor = hoverColor;
        }

        //  Make prediction
        confirmButton.onPointerDownObservable.add(() => {
			if(this.currentResult!=""){
             for(var i = 0; i < this.predictableMeshes.length; i++)
              {
                    if(this.predictableMeshes[i].name == this.currentResult)
                    {
					  var meshCopy = this.predictableMeshes[i].clone((this.predictableMeshes[i].name+"copy"+this.count),null,false);
					  if ((this.xrCamera)&&(meshCopy)){
					  //this.predictableMeshes[i].position = new Vector3(this.xrCamera.position.x,0.6,this.xrCamera.position.z + 1);
					  meshCopy.position = new Vector3(this.xrCamera.position.x,0.6,this.xrCamera.position.z + 3);
                      meshCopy.isPickable;
                      meshCopy.setEnabled(true);
                      meshCopy.getChildMeshes().forEach(mesh => mesh.setEnabled(true));
					  if(meshCopy.name.startsWith("circlecopy")){
						  	var newSphereMaterial = new StandardMaterial("newSphereMaterial"+this.count, this.scene);
	                        newSphereMaterial.diffuseColor = Color3.Random();
							meshCopy.material = newSphereMaterial;
					  }
					  this.count = this.count + 1;
					  }
                    }
              }
			}
        });

        // Create a test button
        var clearCanvasButton = new Button3D("clearButton");
        guiManager.addControl(clearCanvasButton);

        // This must be done after addControl to overwrite the default content
        clearCanvasButton.position = new Vector3(0, 1.6, 3);
        clearCanvasButton.scaling.y = .5;

        // Link a transform node so we can move the button around
        var clearCanvasButtonTransform = new TransformNode("clearCanvasButtonTransform", this.scene);
        clearCanvasButtonTransform.rotation.y = 15 * Math.PI / 180;
        clearCanvasButton.linkToTransformNode(clearCanvasButtonTransform);

        // Create the test button text
        var clearButtonText = new TextBlock();
        clearButtonText.text = "Clear";
        clearButtonText.color = "white";
        clearButtonText.fontSize = 24;
        clearButtonText.scaleY = 2;
        clearCanvasButton.content = clearButtonText;


        // Type cast the button material so we can change the color
        var clearButtonMaterial = <StandardMaterial>clearCanvasButton.mesh!.material;

        // Custom background color
        backgroundColor = new Color3(.284, .73, .831);
        clearButtonMaterial.diffuseColor = backgroundColor;
        clearCanvasButton.pointerOutAnimation = () => {
            clearButtonMaterial.diffuseColor = backgroundColor;
        }

        // Custom hover color
        clearCanvasButton.pointerEnterAnimation = () => {
            clearButtonMaterial.diffuseColor = hoverColor;
        }

        clearCanvasButton.onPointerDownObservable.add(() => {
            this.clearCanvas();
        });

        // Create a test button
        var deleteButton = new Button3D("deleteButton");
        guiManager.addControl(deleteButton);

        // This must be done after addControl to overwrite the default content
        deleteButton.position = new Vector3(0, 0.6, 4);
        deleteButton.scaling.y = .5;

        // Link a transform node so we can move the button around
        var deleteButtonTransform = new TransformNode("deleteButtonTransform", this.scene);
       deleteButtonTransform.rotation.y = 15 * Math.PI / 180;
	   deleteButtonTransform.setParent(this.drawingCanvas);
        deleteButton.linkToTransformNode(deleteButtonTransform);

        // Create the test button text
        var deleteButtonText = new TextBlock();
        deleteButtonText.text = "Delete Mesh";
        deleteButtonText.color = "white";
        deleteButtonText.fontSize = 24;
        deleteButtonText.scaleY = 2;
        deleteButton.content = deleteButtonText;


        // Type cast the button material so we can change the color
        var deleteButtonMaterial = <StandardMaterial>deleteButton.mesh!.material;

        // Custom background color
        backgroundColor = new Color3(.284, .73, .831);
        deleteButtonMaterial.diffuseColor = backgroundColor;
        deleteButton.pointerOutAnimation = () => {
           deleteButtonMaterial.diffuseColor = backgroundColor;
        }

        // Custom hover color
        deleteButton.pointerEnterAnimation = () => {
           deleteButtonMaterial.diffuseColor = hoverColor;
        }

        deleteButton.onPointerDownObservable.add(() => {
            if(this.selectedObjectL){
			  this.selectedObjectL.setParent(null);
			  this.selectedObjectL.dispose();
			  this.selectedObjectL = null;
			}
			else if(this.selectedObjectR){
			  this.selectedObjectR.setParent(null);
			  this.selectedObjectR.dispose();
			  this.selectedObjectR = null;
			}
        });
        
        // Manually create a plane for adding static text
        var staticTextPlane = MeshBuilder.CreatePlane("textPlane", {}, this.scene);
        staticTextPlane.position.y = 1.6;
        staticTextPlane.position.z = 1;
        staticTextPlane.position.x = 1;

        staticTextPlane.isPickable = false;

        // Create a dynamic texture for adding GUI controls
        var staticTextTexture = AdvancedDynamicTexture.CreateForMesh(staticTextPlane, 512, 512);

        // Create a static text block
        var staticText = new TextBlock();
        staticText.text = "Hello world!";
        staticText.color = "white";
        staticText.fontSize = 20;
        staticTextTexture.addControl(staticText);
        this.textBlock = staticText;

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

    private draw(nextposX: number, nextposY: number) {
        if (!this.painting) return;
        Logger.Log("drawing");
        this.ctx!.beginPath();
        this.ctx!.strokeStyle = "black";
        this.ctx!.lineWidth = 10;
        this.ctx!.lineCap = "round";
        this.ctx!.moveTo(this.posX, this.posY);
        this.posX = nextposX;
        this.posY = nextposY;
        this.ctx!.lineTo(this.posX, this.posY);
        this.ctx!.stroke();
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
            console.log(pred);
            var maxIndex = 0;
            for (var i = 0; i < pred.length; i++) {
                if (pred[i] > pred[maxIndex]) {
                    maxIndex = i;
                }
            }
            console.log(this.objectNames[maxIndex]);
            this.textBlock!.text = this.objectNames[maxIndex];
            return this.objectNames[maxIndex];
        } else {
            console.log("Not enough data");
            return "";
        }
    }

    private clearCanvas() {
        console.log("clearing")
        this.ctx!.clearRect(0, 0, this.ctx!.canvas.width, this.ctx!.canvas.height);
        this.ctx!.fillStyle = "white";
        this.ctx!.fillRect(0, 0, this.ctx!.canvas.width, this.ctx!.canvas.height);
        this.dynamicTexture!.update();
        this.points = [];
    }


    // The main update loop will be executed once per frame before the scene is rendered
    private update() : void
	{
	if((this.xrCamera)&&(this.drawingCanvas)){
		if(this.painting == false){
			if(this.drawingCanvas.parent == null){
			//   this.drawingCanvas.position = new Vector3(this.xrCamera.position.x, 0.6, this.xrCamera.position.z+5.0);
              this.drawingCanvas.setParent(this.xrCamera);
              this.drawingCanvas.position.y = -0.6;
              this.drawingCanvas.position.x = 0;
              this.drawingCanvas.rotation.x = 0;
              this.drawingCanvas.rotation.y = 0;
              this.drawingCanvas.rotation.z = 0;
			}
			//this.drawingCanvas.position.y = 0.6;
		}
		else
		{
		  if(this.drawingCanvas.parent != null){
			  this.drawingCanvas.setParent(null);
		  }
		}
    }
      this.processControllerInput();
    }

    private processControllerInput()
    {
        this.onLeftTrigger(this.leftController?.motionController?.getComponent("xr-standard-trigger"));
		this.onLeftSqueeze(this.leftController?.motionController?.getComponent("xr-standard-squeeze"));
		this.onLeftThumbstick(this.leftController?.motionController?.getComponent("xr-standard-thumbstick"));
        this.onRightTrigger(this.rightController?.motionController?.getComponent("xr-standard-trigger"));
		this.onRightSqueeze(this.rightController?.motionController?.getComponent("xr-standard-squeeze"));
		this.onRightThumbstick(this.rightController?.motionController?.getComponent("xr-standard-thumbstick"));
    }

    private onLeftTrigger(component?: WebXRControllerComponent)
    {
        if (component?.pressed)
        {
            Logger.Log("left trigger pressed");
            this.laserPointer!.color = Color3.Green();

            var ray = new Ray(this.leftController!.pointer.position, this.leftController!.pointer.forward, 10);
            var pickInfo = this.scene.pickWithRay(ray);
            // console.log(pickInfo);

            if (pickInfo?.hit) {
                Logger.Log(pickInfo!.pickedMesh!.name);
                if (pickInfo!.pickedMesh && pickInfo!.pickedMesh!.name == "plane") {
                    Logger.Log("ray hit canvas");

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
                    // console.log('canvas' + canvasPos);
                    // console.log('picked' + pickPos);
                    // console.log("draw" + drawingPos);

                    if (!this.painting) {
                        console.log("trigger down");
                        this.painting = true;
                        this.posX = drawingPos.x * 150 + 150;
                        this.posY = -drawingPos.y * 150 + 150
                    } else {
                        console.log("trigger move");
                        this.draw(drawingPos.x * 150 + 150, -drawingPos.y * 150 + 150);
                    }
                    this.points.push(new Vector2(drawingPos.x * 150 + 150, -drawingPos.y * 150 + 150));
                }
            }
        }
        else if (component?.changes.pressed && !component?.pressed)
        {
            this.painting = false;
            this.ctx!.beginPath();
        }
    }

	 private onLeftSqueeze(component?: WebXRControllerComponent)
    {
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
               this.laserPointer!.color = Color3.Green();

                var ray = new Ray(this.leftController!.pointer.position, this.leftController!.pointer.forward, 10);
                var pickInfo = this.scene.pickWithRay(ray);

                // Deselect the currently selected object
                if(this.selectedObjectL)
                {
                   // this.selectedObject.disableEdgesRendering();
				    this.selectedObjectL.setParent(null);
                    this.selectedObjectL = null;
                }

                // If an object was hit, select it
                if((pickInfo?.hit)&&(pickInfo!.pickedMesh!.name != "plane"))
                {
                    this.selectedObjectL = pickInfo!.pickedMesh;
                    //this.selectedObjectL!.enableEdgesRendering();

                    // Parent the object to the transform on the laser pointer
                    this.selectionTransformL!.position = new Vector3(0, 0, pickInfo.distance);
                    this.selectedObjectL!.setParent(this.leftController!.pointer);
                }
            }
            else
            {
                // Reset the laser pointer color
                this.laserPointer!.color = Color3.Blue();

                // Release the object from the laser pointer
                if(this.selectedObjectL)
                {
                    this.selectedObjectL!.setParent(null);
                }
            }
        }
    }
	 private onLeftThumbstick(component?: WebXRControllerComponent)
    {
        // If we have an object that is currently attached to the laser pointer
        if(component?.changes.axes && this.selectedObjectL && this.selectedObjectL.parent)
        {
            // Use delta time to calculate the proper speed
            var moveDistance = -component.axes.y * (this.engine.getDeltaTime() / 1000) * 3;

            // Translate the object along the depth ray in world space
            this.selectedObjectL.translate(this.leftController!.pointer.forward, moveDistance, Space.WORLD);
        }
    }

    private onRightTrigger(component?: WebXRControllerComponent)
    {
        if (component?.pressed)
        {
            this.laserPointer!.color = Color3.Blue();
            this.laserPointer!.parent = this.rightController!.pointer;

            var ray = new Ray(this.rightController!.pointer.position, this.rightController!.pointer.forward, 10);
            var pickInfo = this.scene.pickWithRay(ray);

            if (pickInfo?.hit) {
                Logger.Log(pickInfo!.pickedMesh!.name);
                if (pickInfo!.pickedMesh && pickInfo!.pickedMesh!.name == "plane") {
                    Logger.Log("ray hit canvas");

                    var canvasPos = this.drawingCanvas!.getAbsolutePosition();
                    var pickPos = pickInfo!.pickedPoint;
                    var drawingPos = pickPos!.subtract(canvasPos);
                    // console.log("draw" + drawingPos);

                    // Convert to the drawing canvas local space
                    var m = new Matrix();
                    this.drawingCanvas?.getWorldMatrix().invertToRef(m);
                    canvasPos = Vector3.TransformCoordinates(canvasPos, m);
                    pickPos = Vector3.TransformCoordinates(pickPos!, m);
                    drawingPos = pickPos!.subtract(canvasPos);
                    // console.log('canvas' + canvasPos);
                    // console.log('picked' + pickPos);
                    // console.log("draw" + drawingPos);

                    if (!this.painting) {
                        console.log("trigger down");
                        this.painting = true;
                        this.posX = drawingPos.x * 150 + 150;
                        this.posY = -drawingPos.y * 150 + 150
                    } else {
                        console.log("trigger move");
                        this.draw(drawingPos.x * 150 + 150, -drawingPos.y * 150 + 150);
                    }
                    this.points.push(new Vector2(drawingPos.x * 150 + 150, -drawingPos.y * 150 + 150));
                }
            }
        }
        else if (component?.changes.pressed && !component?.pressed) {
		  this.painting = false;
          this.ctx!.beginPath();
       }
    }

	 private onRightSqueeze(component?: WebXRControllerComponent)
    {
        if(component?.changes.pressed)
        {
            if(component?.pressed)
            {
               //this.laserPointer!.color = Color3.Green();

                var ray = new Ray(this.rightController!.pointer.position, this.rightController!.pointer.forward, 10);
                var pickInfo = this.scene.pickWithRay(ray);

                // Deselect the currently selected object
                if(this.selectedObjectR)
                {
                   // this.selectedObject.disableEdgesRendering();
				   this.selectedObjectR.setParent(null);
                    this.selectedObjectR = null;
                }

                // If an object was hit, select it
                if((pickInfo?.hit)&& (pickInfo!.pickedMesh!.name != "plane"))
                {
                    this.selectedObjectR = pickInfo!.pickedMesh;
                   // this.selectedObject!.enableEdgesRendering();

                    // Parent the object to the transform on the laser pointer
                    this.selectionTransformR!.position = new Vector3(0, 0, pickInfo.distance);
                    this.selectedObjectR!.setParent(this.rightController!.pointer);
                }
            }
            else
            {
                // Reset the laser pointer color
                //this.laserPointer!.color = Color3.Blue();

                // Release the object from the laser pointer
                if(this.selectedObjectR)
                {
                    this.selectedObjectR!.setParent(null);
                }
            }
        }
    }
	 private onRightThumbstick(component?: WebXRControllerComponent)
    {
        // If we have an object that is currently attached to the laser pointer
        if(component?.changes.axes && this.selectedObjectR && this.selectedObjectR.parent)
        {
            // Use delta time to calculate the proper speed
            var moveDistance = -component.axes.y * (this.engine.getDeltaTime() / 1000) * 3;

            // Translate the object along the depth ray in world space
            this.selectedObjectR.translate(this.rightController!.pointer.forward, moveDistance, Space.WORLD);
        }
    }
}
/******* End of the Game class ******/

// start the game
var game = new Game();
game.start();