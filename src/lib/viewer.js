import { parseAnimationSetFromUri } from './animation-parser';
import { createAnimationPlayer } from './animation-player';
import { calculateOrientationFromMatrix } from './calc';
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
    this.animation_set = null;
  }

  set currentAnimation (x) {
    this.player.setAnimation(x);
  }

  set entity (buf) {
    clearViewer(this.viewer);
    const entity = this.viewer.entities.add(createEntity(createUri(buf)));
    const animation_set = parseAnimationSetFromUri(buf);

    this.animation_set = animation_set;
    this.player = createAnimationPlayer(animation_set, entity, 60);
    this.player.setAnimation(animation_set.animations[0].name);
    this.updatePlayer();
    this.viewer.zoomTo(entity);
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

