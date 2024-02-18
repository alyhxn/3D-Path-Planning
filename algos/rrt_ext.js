import * as THREE from 'three';

export default class RRT_Ext{
    constructor(scene, sizes, start, end, obstacles, simulation){
        this.scene = scene;
        this.sizes = sizes;
        this.start = start;
        this.end = end;
        this.lowerLimit = [0, 0, 0];
        this.upperLimit = [49, 19, 49];
        this.obstacles = obstacles;
        this.simulation = simulation;
        this.step_size = 4;
        this.nodes = [this.start];
        this.parents = new Map();

        let geometry = new THREE.SphereGeometry(0.1);
        let material = new THREE.MeshPhongMaterial({color: 'white'});
        this.mesh_node = new THREE.InstancedMesh(geometry, material, 50 * 50 * 20);
        this.mesh_node.count = 0;
        this.mesh_node.setColorAt(0, new THREE.Color(0x000000));
        this.scene.add(this.mesh_node);

        geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(50 * 50 * 20 * 3);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(positions, 3));
        geometry.setDrawRange(0, 0);
        material = new THREE.LineBasicMaterial();
        this.mesh_line = new THREE.LineSegments(geometry, material);
        this.scene.add(this.mesh_line);

        this.raycaster = new THREE.Raycaster();
    }
    run(){
        while(!this.planning()){
        }
        this.find_path();
      }
    planning(){
        let node_new;
        const node_rand = this.get_rand();
        const node_near = this.get_near(node_rand);
        if(this.get_distance(node_near, this.end) < this.step_size + 3 && !this.is_colliding(node_near, this.end))
            node_new = this.end;
        else{
            const inter = this.is_colliding(node_near, node_rand);
            if(inter)
                node_new = inter;
            else
                node_new = node_rand;
        }
        // while(true){
        //     node_rand = this.get_rand();
        //     [node_near, min_dist] = this.get_near(node_rand);
        //     if (this.get_distance(node_near, this.end) < this.step_size + 3){
        //         node_new = this.end;
        //         if(!this.is_colliding(node_near, node_new)){
        //             break;
        //         }
        //     }
        //     node_new = this.get_new(node_near, node_rand, min_dist);
        //     if (node_new[0] < this.lowerLimit[0] || node_new[0] > this.upperLimit[0]  ||
        //         node_new[1] < this.lowerLimit[1] || node_new[1] > this.upperLimit[1]  ||
        //         node_new[2] < this.lowerLimit[2] || node_new[2] > this.upperLimit[2]) {
        //             continue;
        //     }
        //     if(!this.is_colliding(node_near, node_new)){
        //         break;
        //     }
        // }
        if (this.checkNodes(node_new)){
            this.nodes.push(node_new);
            this.parents.set(node_new, node_near);
            if(this.simulation){
                this.draw_node(node_new, node_near, 0x000000);
            }
        }
        if (this.get_distance(node_new, this.end) == 0){
            return true;
        }
        // console.log(node_new)
        return false;
    }
    get_rand(){
        return [Math.random() * 50 , Math.random() * 20, Math.random() * 50];
    }
    get_near(node_rand){
        let min_dist = Infinity;
        let node_near = this.nodes.at(-1);
        let distance;
        for( const node of this.nodes){
            distance = this.get_distance(node, node_rand)   
            if( distance < min_dist){
                min_dist = distance;
                node_near = {...node};
            }
        }
        // return [node_near, min_dist];
        return node_near;
    }
    get_distance(from, to){
        return Math.hypot(from[0] - to[0], from[1] - to[1], from[2] - to[2]);
    }
    is_colliding(node_near, node_new){
        const v1 = new THREE.Vector3(node_near[0], node_near[1], node_near[2]);
        const v2 = new THREE.Vector3(node_new[0], node_new[1], node_new[2]);
        const dir = new THREE.Vector3();
        dir.subVectors(v2, v1).normalize();
        this.raycaster.set(v1, dir);
        const far = new THREE.Vector3();
        this.raycaster.far = far.subVectors(v1, v2).length();
        const inter = this.raycaster.intersectObject(this.obstacles);
        // console.log(inter);
        if(inter.length == 0){
            // const point = inter[0].point;
            // this.draw_test([point.x, point.y, point.z], node_near);
            return false;
        }
        return inter[0].point;
    }
    checkNodes(temp){
        for(const node of this.nodes){
            if(this.get_distance(node, temp) < 0.1)
                return false;
        }
        return true;
    }
    draw_test(position, parent){
        const temp = new THREE.Object3D();
        temp.position.set(position[0], position[1], position[2]);
        temp.updateMatrix();    
        this.mesh_node.setMatrixAt(this.mesh_node.count, temp.matrix);
        this.mesh_node.setColorAt(this.mesh_node.count, new THREE.Color(0x0000ff));
        this.mesh_node.count++;
        this.mesh_node.instanceMatrix.needsUpdate = true;
        this.mesh_node.instanceColor.needsUpdate = true;
        
        if(parent){
            const count = this.mesh_line.geometry.drawRange.count;
            this.mesh_line.geometry.getAttribute('position').setXYZ(count, parent[0], parent[1], parent[2]);
            this.mesh_line.geometry.getAttribute('position').setXYZ(count+1, position[0], position[1], position[2]);
            this.mesh_line.geometry.setDrawRange(0, count + 2);
            this.mesh_line.geometry.attributes.position.needsUpdate = true;
        }
    }
    get_parent(node){
        const keys = this.parents.keys();
        let key;
        for(let i=0; i<this.parents.size; i++){
            key = keys.next().value;
            if (node[0] == key[0] && node[1] == key[1] && node[2] == key[2]){
                return this.parents.get(key);
            }
        }
    }
    find_path(){
        let current = this.end;
        let parent = current;
        while(current){
            this.draw_node(current, parent, 0xffff00);
            parent = current
            current = this.get_parent(current);
        }
    }
    draw_node(position, parent, color){
        const temp = new THREE.Object3D();
        temp.position.set(position[0], position[1], position[2]);
        temp.updateMatrix();
        this.mesh_node.setMatrixAt(this.mesh_node.count, temp.matrix);
        this.mesh_node.setColorAt(this.mesh_node.count, new THREE.Color(color));
        this.mesh_node.count++;
        this.mesh_node.instanceColor.needsUpdate = true;
        this.mesh_node.instanceMatrix.needsUpdate = true;
        
        const count = this.mesh_line.geometry.drawRange.count;
        this.mesh_line.geometry.getAttribute('position').setXYZ(count, parent[0], parent[1], parent[2]);
        this.mesh_line.geometry.getAttribute('position').setXYZ(count+1, position[0], position[1], position[2]);
        this.mesh_line.geometry.setDrawRange(0, count + 2);
        this.mesh_line.geometry.attributes.position.needsUpdate = true;
    }
    dispose(){
        this.mesh_node.geometry.dispose();
        this.mesh_node.material.dispose();
        this.scene.remove(this.mesh_node);
        this.scene.remove(this.mesh_line);
    }
}
