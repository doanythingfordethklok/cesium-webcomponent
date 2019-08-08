import {
  getEntityOrientationFromTransform,
  getEntityPositionFromTransform,
  getRayFromMatrix
} from './calc';

export const rayIntersects = (viewer, current_transform) => {
  const ray = getRayFromMatrix(current_transform, new Cesium.Cartesian3(0, 0, 1));
  const intersection = viewer.scene.globe.pick(ray, viewer.scene);

  return intersection !== undefined;
};

export const findNode = (nodes, name) => {
  for(var i in nodes) {
    if (nodes[i].name === name) {
      return nodes[i];
    }
  }

  return null;
};

export const clearViewer = (viewer) => {
  viewer.entities.removeAll();
  viewer.scene.primitives.removeAll();
};

export const findAttribute = (attrs, key) => {
  let v;

  for(var i = 0; i < attrs.length; i++) {
    if (attrs[i].name === key) {
      v = attrs[i].value;
      break;
    }
  }

  return v;
};

export const createUri = (buf) => {
  const blob = new Blob([ buf ]);

  return URL.createObjectURL(blob);
};

export const createDebugAxis = (viewer) => {
  return viewer.scene.primitives.add(
    new Cesium.DebugModelMatrixPrimitive({
      modelMatrix: new Cesium.Matrix4(),
      length: 125.0,
      width: 5.0,
      show: false
    })
  );
};

export const createSensor = (viewer, current_transform) => {
  const getPosition = translation => () => getEntityPositionFromTransform(current_transform, translation);
  const getOrientation = () => getEntityOrientationFromTransform(current_transform);

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

export const createEntity = (uri, position = Cesium.Cartesian3.fromDegrees(-123.0744619, 44.0503706, 0)) => {
  const entityMatrix = new Cesium.Matrix4();

  Cesium.Transforms.eastNorthUpToFixedFrame(position, Cesium.Ellipsoid.WGS84, entityMatrix);

  return {
    position,
    orientation: getEntityOrientationFromTransform(entityMatrix),
    model: {
      uri,
      runAnimations: false
    }
  };
};

