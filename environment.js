import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default class Env{
    constructor(scene, start, end){
        this.scene = scene;
        this.start = start;
        this.end = end;

        const loader = new GLTFLoader();
        loader.load('../3d_models/collision-world.glb', (gltf) => {
            this.model = gltf;
            gltf.scene.position.set(-10, 0, 0);
            gltf.scene.scale.set(5, 5, 5);
            // console.log(gltf.scene.children[0]);
            gltf.scene.children[0].material.transparent = true;
            gltf.scene.traverse(child => {
                if (child.isMesh){
                    // console.log(child);
                }
            })
        });
        const color = new THREE.Color();
        const temp = new THREE.Object3D();

        let box_geom = new THREE.SphereGeometry(1)
        const se_mat = new THREE.MeshMatcapMaterial({
            color: 'white'
        })
        let mesh = new THREE.InstancedMesh(box_geom, se_mat, 2);
        temp.position.set(this.start[0] + 0.5, this.start[1] + 0.5, this.start[1] + 0.5)
        temp.updateMatrix();
        mesh.setMatrixAt(0, temp.matrix);
        mesh.setColorAt(0, color.setHex(0x00FF00));
        temp.position.set(this.end[0] + 0.5, this.end[1] + 0.5, this.end[2] + 0.5)
        temp.updateMatrix();
        mesh.setMatrixAt(1, temp.matrix);
        mesh.setColorAt(1, color.setHex(0xFF0000));
        this.seMesh = mesh;
        this.scene.add(mesh);
        let plane_geom = new THREE.PlaneGeometry(1000, 1000);
        plane_geom.rotateX(-Math.PI / 2);
        let plane_mat = new THREE.MeshMatcapMaterial({color: 0x967b00});
        let plane_mesh = new THREE.Mesh(plane_geom, plane_mat);
        plane_mesh.position.y -= 50;
        this.scene.add(plane_mesh)

        plane_geom = new THREE.PlaneGeometry(50, 50);
        plane_geom.rotateX(-Math.PI / 2);
        plane_mat = new THREE.MeshMatcapMaterial({color: 'grey'});
        plane_mesh = new THREE.Mesh(plane_geom, plane_mat);
        plane_mesh.position.x += 25;
        plane_mesh.position.z += 25;
        this.scene.add(plane_mesh)

        plane_geom = new THREE.PlaneGeometry(50, 50);
        plane_geom.rotateX(Math.PI / 2);

        plane_mat = new THREE.MeshMatcapMaterial({color: 'grey'});
        plane_mesh = new THREE.Mesh(plane_geom, plane_mat);
        plane_mesh.position.x += 25;
        plane_mesh.position.z += 25;
        plane_mesh.position.y += 20;
        this.scene.add(plane_mesh)

        plane_geom = new THREE.PlaneGeometry(50, 20);
        plane_mat = new THREE.MeshMatcapMaterial({color: 'grey'});
        plane_mesh = new THREE.Mesh(plane_geom, plane_mat);
        plane_mesh.position.x += 25;
        plane_mesh.position.y += 10;
        this.scene.add(plane_mesh)

        plane_geom = new THREE.PlaneGeometry(50, 20);
        plane_geom.rotateX(Math.PI);
        plane_mesh = new THREE.Mesh(plane_geom, plane_mat);
        plane_mesh.position.x += 25;
        plane_mesh.position.y += 10;
        plane_mesh.position.z += 50;
        this.scene.add(plane_mesh)

        plane_geom = new THREE.PlaneGeometry(50, 20);
        plane_geom.rotateY(Math.PI / 2);
        plane_mesh = new THREE.Mesh(plane_geom, plane_mat);
        plane_mesh.position.z += 25;
        plane_mesh.position.y += 10;
        this.scene.add(plane_mesh)

        plane_geom = new THREE.PlaneGeometry(50, 20);
        plane_geom.rotateY(Math.PI / 2);
        plane_geom.rotateZ(Math.PI);
        plane_mesh = new THREE.Mesh(plane_geom, plane_mat);
        plane_mesh.position.z += 25;
        plane_mesh.position.y += 10;
        plane_mesh.position.x += 50;
        this.scene.add(plane_mesh)
    }
    initGeometry(mapName, n){
        const slice = mapName.slice(0, 6)
        if(slice == 'Random')
            this.Random(mapName)
        else if(mapName == 'NewRandomCubes')
            this.NewRandomCubes(n);
        else
            eval('this.'+mapName+'()');

        return [this.instancedMesh, this.obstacles]
    }
    NewRandomCubes(n){
        const box_geom = new THREE.BoxGeometry(1, 1, 1);
        const obs_mat = new THREE.MeshMatcapMaterial({
            color: 'white', transparent: true
        })
        const mesh = new THREE.InstancedMesh(box_geom, obs_mat, n);
        const color = new THREE.Color();
        const temp = new THREE.Object3D();

        let obstacles = [];
        for(let i=0; i<n; i++){
            temp.position.set(Math.floor(Math.random() * 50), Math.floor(Math.random() * 20), Math.floor(Math.random() * 50));
            if (temp.position.x === this.start[0] && temp.position.y == this.start[1] && temp.position.z == this.start[2]){
                continue;
            }
            if (temp.position.x === this.end[0] && temp.position.y == this.end[1] && temp.position.z == this.end[2]){
                continue;
            }
            temp.updateMatrix();
            obstacles.push([temp.position.x, temp.position.y, temp.position.z]);
            temp.position.set(temp.position.x + 0.5, temp.position.y + 0.5, temp.position.z + 0.5);
            temp.updateMatrix();
            mesh.setMatrixAt(i, temp.matrix);
            mesh.setColorAt(i, color.setHex(0xFFFFFF));
        }
        
        this.scene.add(mesh);
        this.instancedMesh = mesh;
        this.obstacles = obstacles;
    }
    Random(mapName){
        const obj = localStorage.getItem(mapName);
        const obstacles = JSON.parse(obj);
        const box_geom = new THREE.BoxGeometry(1, 1, 1);
        const obs_mat = new THREE.MeshMatcapMaterial({
            color: 'white', transparent: true
        })
        const mesh = new THREE.InstancedMesh(box_geom, obs_mat, 3800);
        const color = new THREE.Color();
        const temp = new THREE.Object3D();

        for(const [i, obstacle] of obstacles.entries()){
            temp.position.set(obstacle[0], obstacle[1], obstacle[2]);
            if (temp.position.x === this.start[0] && temp.position.y == this.start[1] && temp.position.z == this.start[2]){
                continue;
            }
            if (temp.position.x === this.end[0] && temp.position.y == this.end[1] && temp.position.z == this.end[2]){
                continue;
            }
            temp.updateMatrix();
            temp.position.set(temp.position.x + 0.5, temp.position.y + 0.5, temp.position.z + 0.5);
            temp.updateMatrix();
            mesh.setMatrixAt(i, temp.matrix);
            mesh.setColorAt(i, color.setHex(0xFFFFFF));
        }
        this.scene.add(mesh);
        this.instancedMesh = mesh;
        this.obstacles = obstacles;
    }
    StructuredCubes(){
        const box_geom = new THREE.BoxGeometry(1, 1, 1);
        const obs_mat = new THREE.MeshMatcapMaterial({
            color: 'white', transparent: true
        })
        this.instancedMesh = new THREE.InstancedMesh(box_geom, obs_mat, 2);
        this.obstacles = [];
        this.count = 0;

        this.buildRect(0, 0, 20, 50, 13, 1);
        this.buildRect(0, 7, 30, 50, 13, 1);
        
        this.scene.add(this.instancedMesh);
    }
    StructuredCubes2(){
        const box_geom = new THREE.BoxGeometry(1, 1, 1);
        const obs_mat = new THREE.MeshMatcapMaterial({
            color: 'white', transparent: true
        })
        this.instancedMesh = new THREE.InstancedMesh(box_geom, obs_mat, 5);
        this.obstacles = [];
        this.count = 0;

        this.buildRect(0, 0, 20, 50, 13, 1);
        this.buildRect(0, 7, 30, 50, 13, 1);
        this.buildRect(0, 13, 10, 30, 1, 10);
        this.buildRect(1, 13, 20, 49, 1, 10);
        this.buildRect(0, 7, 30, 49, 1, 20);
        
        this.scene.add(this.instancedMesh);
    }
    StructuredCubes3(){
        const box_geom = new THREE.BoxGeometry(1, 1, 1);
        const obs_mat = new THREE.MeshMatcapMaterial({
            color: 'white', transparent: true
        })
        this.instancedMesh = new THREE.InstancedMesh(box_geom, obs_mat, 3);
        this.obstacles = [];
        this.count = 0;
        this.buildRect(0, 0, 20, 30, 20, 1);
        this.buildRect(20, 0, 30, 30, 20, 1);
        this.buildRect(19, 0, 25, 1, 20, 5);
        
        this.scene.add(this.instancedMesh);
    }
    StructuredCubes4(){
        const box_geom = new THREE.BoxGeometry(1, 1, 1);
        const obs_mat = new THREE.MeshMatcapMaterial({
            color: 'white', transparent: true
        })
        this.instancedMesh = new THREE.InstancedMesh(box_geom, obs_mat, 5);
        this.obstacles = [];
        this.count = 0;
        this.buildRect(0, 0, 20, 30, 20, 1);
        this.buildRect(20, 0, 30, 30, 20, 1);
        this.buildRect(19, 0, 25, 1, 20, 5);
        this.buildRect(0, 0, 20, 50, 13, 1);
        this.buildRect(0, 7, 30, 50, 13, 1);
        
        this.scene.add(this.instancedMesh);
    }
    StructuredCubes5(){
        const box_geom = new THREE.BoxGeometry(1, 1, 1);
        const obs_mat = new THREE.MeshMatcapMaterial({
            color: 'white', transparent: true
        })
        this.instancedMesh = new THREE.InstancedMesh(box_geom, obs_mat, 4);
        this.obstacles = [];
        this.count = 0;
        this.buildRect(0, 2, 20, 50, 18, 1);
        this.buildRect(0, 0, 20, 50, 1, 1);
        this.buildRect(0, 1, 20, 48, 1, 1);
        this.buildRect(49, 1, 20, 1, 1, 1);
        this.scene.add(this.instancedMesh);
    }
    buildRect(x, y, z, width, height, length){
        const color = new THREE.Color();
        const temp = new THREE.Object3D();

        let hw = width/2, hh = height/2, hl = length/2;
        for(let i=x; i<width+x; i++)
            for(let j=y; j<height+y; j++)
                for(let k=z; k<length+z; k++)
                    this.obstacles.push([i, j, k]);
        
        temp.position.set(x + hw, y + hh, z + hl);
        temp.scale.set(width, height, length);
        temp.updateMatrix();
        this.instancedMesh.setMatrixAt(this.count, temp.matrix);
        this.instancedMesh.setColorAt(this.count, color.setHex(0xFFFF00));
        this.count++;
    }
    RealWorld(){
        this.scene.add(this.model.scene);
        this.instancedMesh = this.model.scene.children[0];
        this.obstacles = null;
    }
    getObstacles(){
        this.scene.remove(this.model.scene);
        this.scene.add(this.instancedMesh);
        return [this.instancedMesh, this.obstacles]
    }
    getCollisionWorld(){
        this.scene.remove(this.instancedMesh);
        this.scene.add(this.model.scene);
        return this.model.scene.children[0];
    }
    change_start_end(start, end){
        this.start = start;
        this.end = end;
        const temp = new THREE.Object3D();
        temp.position.set(this.start[0] + 0.5, this.start[1] + 0.5, this.start[2] + 0.5)
        temp.updateMatrix();
        this.seMesh.setMatrixAt(0, temp.matrix);
        this.seMesh.instanceMatrix.needsUpdate = true;
        temp.position.set(this.end[0] + 0.5, this.end[1] + 0.5, this.end[2] + 0.5)
        temp.updateMatrix();
        this.seMesh.setMatrixAt(1, temp.matrix);
        this.seMesh.instanceMatrix.needsUpdate = true;
    }
    dispose_obstacle(){
        this.instancedMesh.geometry.dispose();
        this.instancedMesh.material.dispose();
        this.scene.remove(this.instancedMesh);
    }

}