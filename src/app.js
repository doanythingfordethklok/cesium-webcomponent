// This is where you could put an app using Elm, react, Vue, Angular, or whatever.
// Using plain JS to avoid complicated build pipelines or implying certain opinions
const modelViewer = document.getElementById('demo_viewer');
const btnPlay = document.getElementById('btn_play');
const btnPause = document.getElementById('btn_pause');
const btnStop = document.getElementById('btn_stop');
const selAnimation = document.getElementById('animation');
const selAnimationNode = document.getElementById('animation_node');

document.getElementById('file').addEventListener('change', (e) => {
  const reader = new FileReader();

  reader.onload = function () {
    modelViewer.entity = reader.result;

    const { animations, nodes } = modelViewer.animationSet;

    selAnimation.innerHTML = animations.map(a => `<option>${a.name}</option>`).join('');

    const node_opts = [];

    for(var n in nodes) {
      node_opts.push(`<option>${nodes[n].name}</option>`);
    }

    selAnimationNode.innerHTML = node_opts.join('');
  };

  reader.readAsArrayBuffer(e.target.files[0]);
});

btnPlay.addEventListener('click', () => modelViewer.setAttribute('action', 'play'));
btnPause.addEventListener('click', () => modelViewer.setAttribute('action', 'pause'));
btnStop.addEventListener('click', () => modelViewer.setAttribute('action', 'stop'));
selAnimation.addEventListener('change', (e) => modelViewer.currentAnimation = e.target.value);
selAnimationNode.addEventListener('change', (e) => modelViewer.trackedNode = e.target.value);

