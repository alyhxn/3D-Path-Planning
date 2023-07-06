import * as THREE from 'three';
import Stats from "Stats";
import { GUI } from "GUI";
import { OrbitControls } from "OrbitControls";
import Env from './environment.js';
import Astar from './astar.js';
import RRT from './rrt.js';
import RRT_Ext from './rrt_ext.js';
import RBT from './rbt.js';
import RBT_Ext from './rbt_ext.js';
import RRRT from './rrrt.js';
import ImprovedRRTStar from './ImprovedRRTStar.js';

class Simulator{
    constructor(){
        this.scene = new THREE.Scene();
        this.clock = new THREE.Clock();
        this.delta = 0;
        this.FPS = 100;
        this.getWinSize();
        this.initFPS();
        this.initGUI();
        this.initEvenListeners();
        this.initHelpers();
        this.check = false;

        this.start = [1, 1, 1];
        this.end = [40, 15, 40];
        this.initLight();
        this.initCamera();
        this.initAction();
        this.env = new Env(this.scene, this.start, this.end);
        [this.obstacles_mesh, this.obstacles] = this.env.initGeometry('NewRandomCubes', 2000);
    }
    getWinSize(){
        this.winSize = {
            width: window.innerWidth,
            height: window.innerHeight
        }
    }
    initFPS(){
        this.stats = new Stats();
        this.stats.showPanel(0);
        document.body.append(this.stats.dom);
    }
    initGUI(){
        const gui = new GUI({width: 200});
        const startFolder = gui.addFolder('Start Position');
        const endFolder = gui.addFolder('End Position');
        const settings = gui.addFolder('Settings');
        const self = this;
        this.props = {
            Simulation: false,
            Speed: 100,
            Env: 'New Random Cubes',
            No_of_obs: 2000,
            Algo: 'RBT_Ext',
            Apply: function() {
                self.onApply();
            },
            Run: function() {
                self.onRun();
            },
            'Pause/Resume': function() {
                self.check = !self.check;
            },
            Save: function(){
                self.onSave();
            }
        };
        this.startObj = {
            x: 0,
            y: 0,
            z: 0,
        }
        this.endObj = {
            x: 40,
            y: 15,
            z: 40,
        }
        startFolder.add(this.startObj, 'x', 1, 49)
        startFolder.add(this.startObj, 'y', 1, 19)
        startFolder.add(this.startObj, 'z', 1, 49)
        endFolder.add(this.endObj, 'x', 1, 49)
        endFolder.add(this.endObj, 'y', 1, 19)
        endFolder.add(this.endObj, 'z',1, 49)

        settings.add(this.props, 'Simulation');
        settings.add(this.props, 'Speed', 1, 200);
        settings.add(this.props, 'Env', [ 'New Random Cubes', 'Structured Cubes', 'Structured Cubes 2', 'Structured Cubes 3', 'Structured Cubes 4']);
        settings.add(this.props, 'No_of_obs', 2000, 4000, 100);
        settings.add(this.props, 'Apply');
        settings.add(this.props, 'Algo', [ 'Astar', 'RRT', 'RRT_Ext', 'RBT', 'Improved RRT*']);
        settings.add(this.props, 'Run');
        settings.add(this.props, 'Pause/Resume');
        settings.add(this.props, 'Save')
        gui.close()
    }
    onApply(){
        this.start = [this.startObj.x, this.startObj.y, this.startObj.z];
        this.end = [this.endObj.x, this.endObj.y, this.endObj.z];
        this.env.change_start_end(this.start, this.end);
        this.env.dispose_obstacle();
        if (this.algo){
            this.algo.dispose();
        }
        [this.obstacles_mesh, this.obstacles] = this.env.initGeometry(this.props.Env.replace(/ /g, ''), this.props.No_of_obs);
    }
    onRun(){
        if (this.algo){
            this.algo.dispose();
        }
        if (this.props.Algo == 'Astar'){
            this.algo = new Astar(this.scene, this.winSize, this.start, this.end, this.obstacles, this.props.Simulation);
        }
        else if(this.props.Algo == 'RBT') {
            this.algo = new RBT_Ext(this.scene, this.winSize, this.start, this.end, this.obstacles_mesh, this.obstacles, this.props.Simulation);
        }
        // else if(this.props.Algo == 'RBT_Ext') {
        //     this.algo = new RBT_Ext(this.scene, this.winSize, this.start, this.end, this.obstacles_mesh, this.obstacles, this.props.Simulation);
        // }
        else if(this.props.Algo == 'RRT_Ext'){
            this.algo = new RRT_Ext(this.scene, this.winSize, this.start, this.end, this.obstacles_mesh, this.props.Simulation);
        }
        // else if(this.props.Algo == 'RRRT'){
        //     this.algo = new RRRT(this.scene, this.winSize, this.start, this.end, this.obstacles_mesh, this.obstacles, this.props.Simulation);
        // }
        else if(this.props.Algo == 'Improved RRT*'){
            this.algo = new ImprovedRRTStar(this.scene, this.winSize, this.start, this.end, this.obstacles_mesh, this.props.Simulation);
        }
        else{
            this.algo = new RRT(this.scene, this.winSize, this.start, this.end, this.obstacles_mesh, this.props.Simulation);
        }
        this.check = true;
    }
    onSave(){
        const jsonObj = JSON.stringify(this.obstacles);
        localStorage.setItem("Random3", jsonObj);
    }
    initEvenListeners(){
        window.addEventListener('resize', () => {
            this.getWinSize();
            this.canvas.width = this.winSize.width;
            this.canvas.height = this.winSize.height;
            this.camera.aspect = this.winSize.width / this.winSize.height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.winSize.width, this.winSize.height);
        });
        window.addEventListener('keypress', (e) => {
            if(e.code === "KeyH")
                this.obstacles_mesh.visible = !this.obstacles_mesh.visible;
            
            if(e.code === 'KeyT'){
                if(this.obstacles_mesh.material.opacity == 0.5)
                    this.obstacles_mesh.material.opacity = 1;
                else
                    this.obstacles_mesh.material.opacity = 0.5;
            }
            if(e.code === 'KeyR'){
                this.onRun();
            }
            if(e.code === 'KeyP'){
                this.check = !this.check;
            }
        })
        const blocker = document.getElementById( 'blocker' );
        const instructions = document.getElementById( 'instructions' );
        instructions.addEventListener( 'click', function () {
            instructions.style.display = 'none';
            blocker.style.display = 'none';
        } );
    }
    initHelpers(){
        const axesHelper = new THREE.AxesHelper( 5 );
        this.scene.add( axesHelper );
    }
    initLight(){
        this.scene.background = new THREE.Color( 0x00aaff );
        this.scene.fog = new THREE.Fog( 0x00aaff, 0, 500 );

        // const ambientLight = new THREE.AmbientLight( 0xcccccc );
        // this.scene.add( ambientLight );
        const directionalLight = new THREE.DirectionalLight( 0xffffff, 2 );
        // directionalLight.position.set( 1, 1, 1.5 ).normalize();
        directionalLight.position.set(0, 10, 10);
        this.scene.add( directionalLight );
        // const ambientLight = new THREE.AmbientLight();
        // this.scene.add(ambientLight);
      }
    initCamera(){
        this.camera = new THREE.PerspectiveCamera(45, this.winSize.width / this.winSize.height);
        this.camera.position.set(19, 73, 19);
        this.scene.add(this.camera);
    }
    initAction(){
        const canvas = document.querySelector('.webgl');
        this.renderer = new THREE.WebGLRenderer({ canvas });
        const pmremGenerator = new THREE.PMREMGenerator( this.renderer );
        this.renderer.setSize(this.winSize.width, this.winSize.height);
        this.controls = new OrbitControls(this.camera, canvas);
        this.canvas = canvas;
    }
    
    loop(){
        var self = this;
        const result = document.getElementById( 'result' );
        let cost;
        this.renderer.setAnimationLoop(() => {
            self.delta += 1;
            self.FPS = Math.round(100/self.props.Speed);
            if(self.delta % self.FPS == 0)
                if(self.check){
                    if(self.props.Simulation){
                        if(self.algo.planning()){
                            self.check = false;
                            // self.algo.find_path();
                        }
                    }
                    else{
                        const startTime = new Date();
                        cost = self.algo.run()
                        const time = new Date() - startTime + ' ms'
                        console.log(time, cost, this.algo.nodes.length);
                        result.innerHTML = time;
                        self.check = false;
                    }
                    
                }
            self.stats.update();
            self.controls.update();
            self.renderer.render(self.scene, self.camera);
        })
    }

}

const sim = new Simulator();

sim.loop();
