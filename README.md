# Cesium Sensor Demo
This project shows how to attach a geometry (e.g. the sensor) to an existing node in a model. 

# Run the code
* Install using either `yarn install` or `npm install`. 
* Run the web page using `yarn run dev` or `npm run dev`.
* Open Chrome or Firefox and navigate to http://localhost:8089

# About the code
This project is implemented using Web Components. It uses a custom element like this. `./src/app.js` is where you would build an application. In this demo, it uses pure js instead of a framework to avoid the opinions and complexity of a framework confusing what is really happening. 

```
<model-viewer 
  id="demo_viewer" 
  width="1000px" 
  height="600px" 
  action="stop"
></model-viewer>
```