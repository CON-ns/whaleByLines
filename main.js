import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js"; //stlデータ読み込み
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';

const whalePath = "./texture/ballena.obj";
// const whalePath = "./texture/BL_WHALE.obj";

//canvasを定義
const webgl = document.getElementById('webgl-canvas');

//サイズを定義
const sizes = {
  width: innerWidth,
  height: innerHeight,
};
const pixelRatio = sizes.width / sizes.height;

//シーンを定義
const scene = new THREE.Scene();

//カメラを定義
const camera = new THREE.PerspectiveCamera(
  60,
  pixelRatio,
  0.1,
  1000
);

camera.position.z = 25;
camera.position.y = 10;

//レンダラーを定義
const renderer = new THREE.WebGLRenderer({ antialias:true,alpha:true });
renderer.setPixelRatio(pixelRatio);
renderer.setSize(sizes.width, sizes.height);
document.body.appendChild(renderer.domElement);

//カメラコントロールを定義
const orbitControls = new OrbitControls(camera, renderer.domElement); //マウス操作用のorbitControlsを定義
orbitControls.enableDamping = true;

// レンダーパスを定義
const renderScene = new RenderPass(scene, camera);

// bloomPathを定義
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(sizes.width, sizes.height),
  1.5,
  0.4,
  0.85
);
bloomPass.threshold = 0;
bloomPass.strength = 1.0;//明るさ

//コンポーザー(オブジェクトを加工するのに必要)を定義
const composer = new EffectComposer(renderer);
composer.setPixelRatio(pixelRatio);
composer.addPass(renderScene);
composer.addPass(bloomPass);

//グループを定義
const group = new THREE.Group();
scene.add(group);


//モデルデータの読み込み
let whale = null;
let sampler = null;
let path = null;
let paths = [];

new OBJLoader().load(
  whalePath,
  (obj) => {
    whale = obj.children[0];
    sampler = new MeshSurfaceSampler(whale).build();
    //ループの回数分の描画開始点を持つ
    for (let i = 0; i < 6; i++){
      path = new Path(i);
      paths.push(path);
      group.add(path.line);
    }
    renderer.setAnimationLoop(render);
  },
  (xhr) => console.log((xhr.loaded / xhr.total) * 100 + "% loaded"),
  (err) => console.error(err)
)

//表面座標取得し、パスを生成する用クラス
const tempPosition = new THREE.Vector3();

//whale描画時の線の色
const lines = [];
let lineMaterials = [
  new THREE.LineBasicMaterial({ transparent: true, color: 0x125D98 }),
  new THREE.LineBasicMaterial({ transparent: true, color: 0xCFD6DE })
];

class Path{
  constructor(index) {
    this.vertices = [];//頂点座標用配列
    this.geometry = new THREE.BufferGeometry();
    this.material = lineMaterials[index % 2];//引数に渡すインデックスでランダムな色のマテリアルを取得
    this.line = new THREE.Line(this.geometry, this.material);

    sampler.sample(tempPosition);//表面座標を取得
    this.previousPoint = tempPosition.clone();
  }

  update() {
    let pointFound = false;
    while (!pointFound) {
      sampler.sample(tempPosition);
      if (tempPosition.distanceTo(this.previousPoint) < 1) {
        this.vertices.push(tempPosition.x, tempPosition.y, tempPosition.z);
        this.previousPoint = tempPosition.clone();
        pointFound = true;
      }
    }
    this.geometry.setAttribute("position", new THREE.Float32BufferAttribute(this.vertices, 3));
  }
}

function render() {
  group.rotation.y += 0.002;
  paths.forEach(path => {
    if (path.vertices.length < 10000) {
      path.update();
    }
  })
  composer.render();
}

window.addEventListener("resize", onWindowResize, false);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}


