import { parseAnimationSetFromUri } from './lib/animation-parser';
import { createAnimationPlayer } from './lib/animation-player';
import { calcNodeWorldSpaceTransform } from './lib/transform';
import {
  findNode,
  clearViewer,
  findAttribute,
  createUri,
  createDebugAxis,
  createSensor,
  createEntity,
  rayIntersects
} from './lib/viewer_helpers';

class CesiumModelViewer extends HTMLElement {
  // Specify observed attributes so that
  // attributeChangedCallback will work
  static get observedAttributes () {
    return [ 'src', 'action', 'width', 'height', 'fps' ];
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
    this.sensor = null;
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
    const { sensor, debug_axis } = this;
    const { boresight, cone } = sensor;

    this.tracked_node = findNode(this.player.animation_set.nodes, x);

    if (this.tracked_node) {
      debug_axis.show = true;
      boresight.show = true;
      cone.show = true;
    }
    else {
      debug_axis.show = false;
      boresight.show = false;
      cone.show = false;
    }
  }

  set entity (buf) {
    if (buf instanceof ArrayBuffer === false) {
      return;
    }

    clearViewer(this.viewer);

    const entity = this.viewer.entities.add(createEntity(createUri(buf)));
    const animation_set = parseAnimationSetFromUri(buf);
    const fps = findAttribute(this.attributes, 'fps') || 60;

    this.debug_axis = createDebugAxis(this.viewer);
    this.sensor = createSensor(this.viewer, this.current_transform);
    this.player = createAnimationPlayer(animation_set, entity, fps);
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
    const PLAYER_ACTIONS = [ 'play', 'pause', 'stop' ];
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
      this.updateSensor();
    }
  }

  updateSensor () {
    const { sensor, viewer, current_transform } = this;
    const { boresight } = sensor;

    if (boresight) {
      if (rayIntersects(viewer, current_transform) === true) {
        boresight.cylinder.material = Cesium.Color.PURPLE;
      }
      else {
        boresight.cylinder.material = Cesium.Color.ORANGE;
      }
    }
  }

  attributeChangedCallback (name, _, newValue) {
    const that = this;

    switch (name) {
      case 'fps':
        if (this.player) {
          this.player.setFPS(Number(newValue));
        }
        break;
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

