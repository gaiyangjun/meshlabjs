/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

MLJ.core.Scene = {};

(function () {

    //Contains all mesh in the scene
    var layers = new MLJ.util.AssociativeArray();

    //Reference to selected layer (type MeshFile)
    var selectedLayer;

    var scene, camera, renderer;


//SCENE INITIALIZATION  ________________________________________________________

    function get3DSize() {
        var _3D = $('#_3D');

        return {
            width: _3D.width(),
            height: _3D.height()
        };
    }

    function initScene() {
        var _3DSize = get3DSize();

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(45, _3DSize.width / _3DSize.height, 0.1, 1800);
        camera.position.z = 15;
        renderer = new THREE.WebGLRenderer({alpha: true});
        renderer.shadowMapEnabled = true;
        renderer.setSize(_3DSize.width, _3DSize.height);
        $('#_3D').append(renderer.domElement);
        scene.add(camera);

        //INIT CONTROLS  ___________________________________________________
        var container = document.getElementsByTagName('canvas')[0];
        var controls = new THREE.TrackballControls(camera, container);
        controls.rotateSpeed = 4.0;
        controls.zoomSpeed = 1.2;
        controls.panSpeed = 2.0;
        controls.noZoom = false;
        controls.noPan = false;
        controls.staticMoving = true;
        controls.dynamicDampingFactor = 0.3;
        controls.keys = [65, 83, 68];

        //EVENT HANDLERS _______________________________________________________

        $('canvas')[0].addEventListener('touchmove', controls.update.bind(controls), false);
        $('canvas')[0].addEventListener('mousemove', controls.update.bind(controls), false);
        $('canvas')[0].addEventListener('mousewheel', function () {
            controls.update();
            return false;
        }, false);

        controls.addEventListener('change', function () {
            MLJ.core.Scene.render();
        });

        $(window).resize(function () {
            var size = get3DSize();

            camera.aspect = size.width / size.height;
            camera.updateProjectionMatrix();
            renderer.setSize(size.width, size.height);

            MLJ.core.Scene.render();
        });

        $(document).on(MLJ.events.File.MESH_FILE_OPENED,
                function (event, mesh) {
                    MLJ.core.Scene.addMesh(mesh);

                    $(document).trigger(
                            MLJ.events.Scene.LAYER_ADDED, [mesh]);
                });

        $(document).on(MLJ.events.Gui.LAYER_SELECTION_CHANGED,
                function (event, layerName) {
                    selectedLayer = layers.getByKey(layerName);
                    $(document).trigger(
                            MLJ.events.Scene.LAYER_SELECTED, [selectedLayer]);
                });

        $(document).on(MLJ.events.Gui.HIDE_LAYER,
                function (event, layerName) {
                    var layer = layers.getByKey(layerName);
                    layer.getThreeMesh().visible = false;
                    MLJ.core.Scene.render();
                });

        $(document).on(MLJ.events.Gui.SHOW_LAYER,
                function (event, layerName) {
                    var layer = layers.getByKey(layerName);
                    layer.getThreeMesh().visible = true;
                    MLJ.core.Scene.render();
                });
    }

    function computeGlobalBBbox() {
        var ptr = layers.pointer();
        var threeMesh;
        while (ptr.hasNext()) {
            threeMesh = ptr.next().getThreeMesh();
            if (threeMesh.scaleFactor) {
                threeMesh.position.x -= threeMesh.offsetVec.x;
                threeMesh.position.y -= threeMesh.offsetVec.y;
                threeMesh.position.z -= threeMesh.offsetVec.z;
                var scaling = threeMesh.scaleFactor;
                threeMesh.scale.multiplyScalar(1 / scaling);
            }
        }

        var BBGlobal = new THREE.Box3();
        ptr = layers.pointer();
        while (ptr.hasNext()) {
            threeMesh = ptr.next().getThreeMesh();
            var bbox = new THREE.Box3().setFromObject(threeMesh);
            BBGlobal.union(bbox);
        }

        ptr = layers.pointer();
        while (ptr.hasNext()) {
            threeMesh = ptr.next().getThreeMesh();
            var scaleFac = 15.0 / (BBGlobal.min.distanceTo(BBGlobal.max));
            threeMesh.scale.multiplyScalar(scaleFac);
            threeMesh.scaleFactor = scaleFac;
        }

        BBGlobal = new THREE.Box3();
        ptr = layers.pointer();
        while (ptr.hasNext()) {
            threeMesh = ptr.next().getThreeMesh();
            var bbox = new THREE.Box3().setFromObject(threeMesh);
            BBGlobal.union(bbox);
        }

        ptr = layers.pointer();
        while (ptr.hasNext()) {
            threeMesh = ptr.next().getThreeMesh();
            var offset = new THREE.Vector3();
            offset = BBGlobal.center().negate();
            threeMesh.position.x += offset.x;
            threeMesh.position.y += offset.y;
            threeMesh.position.z += offset.z;
            threeMesh.offsetVec = offset;
        }

    }

    this.addMesh = function (meshFile) {
        if (meshFile instanceof MLJ.core.MeshFile) {

            //Add new mesh to associative array layers
            layers.set(meshFile.name, meshFile);

            //Set mesh position
            var mesh = meshFile.getThreeMesh();
            var box = new THREE.Box3().setFromObject(mesh);
            mesh.position = box.center();
            scene.add(mesh);

            selectedLayer = meshFile;

            //Compute the global bounding box
            computeGlobalBBbox();

            //render the scene
            this.render();

        } else {
            console.error("The parameter must be an instance of MLJ.core.MeshFile");
        }
    };

    this.render = function () {
        renderer.render(scene, camera);
    };

    $(document).ready(function () {
        initScene();
    });

}).call(MLJ.core.Scene);
