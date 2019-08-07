import { parseAnimationSetFromUri } from './animation-parser';
import { createAnimationPlayer } from './animation-player';
import { calculateOrientationFromMatrix, calculatePositionFromMatrix, calculateDirectionFromMatrix } from './calc';
import { calcNodeWorldSpaceTransform } from './transform';

const PLAYER_ACTIONS = [ 'play', 'pause', 'stop' ];

const createEntity = (uri, position = Cesium.Cartesian3.fromDegrees(-123.0744619, 44.0503706, 0)) => {
  const entityMatrix = new Cesium.Matrix4();

  Cesium.Transforms.eastNorthUpToFixedFrame(position, Cesium.Ellipsoid.WGS84, entityMatrix);

  return {
    position,
    orientation: calculateOrientationFromMatrix(entityMatrix),
    model: {
      uri,
      runAnimations: false
    }
  };
};

const createDebugAxis = (viewer) => {
  return viewer.scene.primitives.add(
    new Cesium.DebugModelMatrixPrimitive({
      modelMatrix: new Cesium.Matrix4(),
      length: 125.0,
      width: 5.0,
      show: false
    })
  );
};

const createScope = (viewer, current_transform) => {
  const getPosition = translation => () => calculatePositionFromMatrix(current_transform, translation);
  const getOrientation = () => calculateOrientationFromMatrix(current_transform);

  const CONE_LENGTH = 50;

  const cone = viewer.entities.add({
    name: 'cone',
    position: new Cesium.CallbackProperty(getPosition(new Cesium.Cartesian3(0, 0, CONE_LENGTH / 2)), false),
    orientation: new Cesium.CallbackProperty(getOrientation, false),
    show: false,
    cylinder: {
      length: CONE_LENGTH,
      topRadius: 20.0,
      bottomRadius: 0,
      material: Cesium.Color.PINK.withAlpha(0.3),
      outline: true,
      outlineColor: Cesium.Color.RED.withAlpha(0.5)
    }
  });

  const LINE_LENGTH = 500;

  const boresight = viewer.entities.add({
    name: 'boresight',
    position: new Cesium.CallbackProperty(getPosition(new Cesium.Cartesian3(0, 0, LINE_LENGTH / 2)), false),
    orientation: new Cesium.CallbackProperty(getOrientation, false),
    show: false,
    cylinder: {
      length: LINE_LENGTH,
      topRadius: 1,
      bottomRadius: 1,
      material: Cesium.Color.ORANGE,
      outline: true,
      outlineColor: Cesium.Color.BLACK.withAlpha(0.5)
    }
  });

  return  { cone, boresight };
};

const findNode = (nodes, name) => {
  for(var i in nodes) {
    if (nodes[i].name === name) {
      return nodes[i];
    }
  }

  return null;
};

const clearViewer = (viewer) => {
  viewer.entities.removeAll();
  viewer.scene.primitives.removeAll();
};

const findAttribute = (attrs, key) => {
  let v;

  for(var i = 0; i < attrs.length; i++) {
    if (attrs[i].name === key) {
      v = attrs[i].value;
      break;
    }
  }

  return v;
};

const createUri = (buf) => {
  const blob = new Blob([ buf ]);

  return URL.createObjectURL(blob);
};

class CesiumModelViewer extends HTMLElement {
  // Specify observed attributes so that
  // attributeChangedCallback will work
  static get observedAttributes () {
    return [ 'src', 'action', 'width', 'height' ];
  }

  constructor () {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    const root = document.createElement('div');
    const style = document.createElement('style');

    style.innerText = `
      @import './Build/Cesium/Widgets/widgets.css';
    `;

    shadow.appendChild(style);
    shadow.appendChild(root);

    this.viewer = new Cesium.Viewer(root);
    this.player = null;
    this.root = root;
    this.current_transform = new Cesium.Matrix4();
    this.debug_axis = null;
    this.debug_scope = null;
    this.tracked_node = null;
    this.entity_model = null;
  }

  get animationSet () {
    return this.player.animation_set;
  }

  set currentAnimation (x) {
    this.player.setAnimation(x);
  }

  set trackedNode (x) {
    const { debug_scope, debug_axis } = this;
    const { boresight, cone } = debug_scope;

    this.tracked_node = findNode(this.player.animation_set.nodes, x);

    if (this.tracked_node) {
      debug_axis.show = boresight.show = cone.show = true;
    }
    else {
      debug_axis.show = boresight.show = cone.show = false;
    }
  }

  set entity (buf) {
    if (buf instanceof ArrayBuffer === false) {
      return;
    }

    clearViewer(this.viewer);

    const entity = this.viewer.entities.add(createEntity(createUri(buf)));
    const animation_set = parseAnimationSetFromUri(buf);

    this.debug_axis = createDebugAxis(this.viewer);
    this.debug_scope = createScope(this.viewer, this.current_transform);
    this.player = createAnimationPlayer(animation_set, entity, 60);
    this.player.setAnimation(animation_set.animations[0].name);
    this.updatePlayer();
    this.viewer.zoomTo(entity);
    this.entity_model = entity;
    this.tracked_node = null;

    // register hooks for the animation so that attached geometry can use it
    const updateTransform = this.updateTransform.bind(this);

    this.player.addUpdateHook(updateTransform);
  }

  updateContainerDimensions () {
    const width = findAttribute(this.attributes, 'width') || '800px';
    const height = findAttribute(this.attributes, 'height') || '600px';

    this.root.setAttribute('style', `width:${width}; height:${height};`);
  }

  updatePlayer () {
    const action = findAttribute(this.attributes, 'action');

    if (this.player && PLAYER_ACTIONS.indexOf(action) !== -1) {
      this.player[action](this.player.animation_set.animations[0].name);
    }
  }

  updateTransform () {
    if (this.tracked_node) {
      const matrix = calcNodeWorldSpaceTransform(
        this.player.animation_set,
        this.entity_model,
        this.tracked_node
      );

      this.debug_axis.modelMatrix = matrix;
      Cesium.Matrix4.clone(matrix, this.current_transform);
      this.updateBoreSight();
    }
  }

  updateBoreSight () {
    const { debug_scope, viewer, current_transform } = this;
    const { boresight, cone } = debug_scope;

    if (boresight) {
      const ray = calculateDirectionFromMatrix(current_transform, new Cesium.Cartesian3(0, 0, 1));
      const intersection = viewer.scene.globe.pick(ray, viewer.scene);

      if (intersection === undefined) {
        boresight.cylinder.material = Cesium.Color.ORANGE;
      }
      else {
        boresight.cylinder.material = Cesium.Color.PURPLE;
      }
    }
  }

  attributeChangedCallback (name, _, newValue) {
    const that = this;

    switch (name) {
      case 'src':
        if (newValue) {
          fetch(newValue)
            .then(res => res.arrayBuffer())
            .then(buf => that.entity = buf);
        }
        break;
      case 'action':
        // play, pause, stop.
        this.updatePlayer();

        break;

      case 'width':
      case 'height':
        this.updateContainerDimensions();
        break;

      default:
        throw Error('prop not supported');
    }
  }
}

customElements.define('model-viewer', CesiumModelViewer);

