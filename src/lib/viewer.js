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

class CesiumModelViewer extends HTMLElement {
  // Specify observed attributes so that
  // attributeChangedCallback will work
  static get observedAttributes () {
    return [ 'src', 'action', 'width', 'height' ];
  }

  constructor () {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    shadow.innerHTML = `
    <script src="https://cesiumjs.org/releases/1.60/Build/Cesium/Cesium.js"></script>
    <link href="https://cesiumjs.org/releases/1.60/Build/Cesium/Widgets/widgets.css" type="text/css" rel="stylesheet" />
    `;

    const root = document.createElement('div');
    const css = document.createElement('style');

    css.innerText = '';

    shadow.appendChild(css);
    shadow.appendChild(root);

    this.viewer = new Cesium.Viewer(root);
    this.player = null;
    this.css = css;
    this.root = root;
  }

  setModel (uri) {
    const that = this;

    clearViewer(this.viewer);

    fetch(uri)
      .then(res => res.arrayBuffer())
      .then(buf => {
        const entity = that.viewer.entities.add(createEntity(uri));
        const animation_set = parseAnimationSetFromUri(buf);

        that.viewer.zoomTo(entity);
        that.player = createAnimationPlayer(animation_set, entity, 60);
        that.player.setAnimation(animation_set.animations[0].name);
        that.updatePlayer();
      });
  }

  updateCss () {
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
    switch (name) {
      case 'src':
        if (newValue) {
          this.setModel(newValue);
        }
        break;
      case 'action':
        // play, pause, stop.
        this.updatePlayer();

        break;

      case 'width':
      case 'height':
        this.updateCss();
        break;

      default:
        throw Error('prop not supported');
    }
  }
}

customElements.define('model-viewer', CesiumModelViewer);

