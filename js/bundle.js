(function() {
  'use strict';

  var globals = typeof global === 'undefined' ? self : global;
  if (typeof globals.require === 'function') return;

  var modules = {};
  var cache = {};
  var aliases = {};
  var has = {}.hasOwnProperty;

  var expRe = /^\.\.?(\/|$)/;
  var expand = function(root, name) {
    var results = [], part;
    var parts = (expRe.test(name) ? root + '/' + name : name).split('/');
    for (var i = 0, length = parts.length; i < length; i++) {
      part = parts[i];
      if (part === '..') {
        results.pop();
      } else if (part !== '.' && part !== '') {
        results.push(part);
      }
    }
    return results.join('/');
  };

  var dirname = function(path) {
    return path.split('/').slice(0, -1).join('/');
  };

  var localRequire = function(path) {
    return function expanded(name) {
      var absolute = expand(dirname(path), name);
      return globals.require(absolute, path);
    };
  };

  var initModule = function(name, definition) {
    var hot = hmr && hmr.createHot(name);
    var module = {id: name, exports: {}, hot: hot};
    cache[name] = module;
    definition(module.exports, localRequire(name), module);
    return module.exports;
  };

  var expandAlias = function(name) {
    return aliases[name] ? expandAlias(aliases[name]) : name;
  };

  var _resolve = function(name, dep) {
    return expandAlias(expand(dirname(name), dep));
  };

  var require = function(name, loaderPath) {
    if (loaderPath == null) loaderPath = '/';
    var path = expandAlias(name);

    if (has.call(cache, path)) return cache[path].exports;
    if (has.call(modules, path)) return initModule(path, modules[path]);

    throw new Error("Cannot find module '" + name + "' from '" + loaderPath + "'");
  };

  require.alias = function(from, to) {
    aliases[to] = from;
  };

  var extRe = /\.[^.\/]+$/;
  var indexRe = /\/index(\.[^\/]+)?$/;
  var addExtensions = function(bundle) {
    if (extRe.test(bundle)) {
      var alias = bundle.replace(extRe, '');
      if (!has.call(aliases, alias) || aliases[alias].replace(extRe, '') === alias + '/index') {
        aliases[alias] = bundle;
      }
    }

    if (indexRe.test(bundle)) {
      var iAlias = bundle.replace(indexRe, '');
      if (!has.call(aliases, iAlias)) {
        aliases[iAlias] = bundle;
      }
    }
  };

  require.register = require.define = function(bundle, fn) {
    if (bundle && typeof bundle === 'object') {
      for (var key in bundle) {
        if (has.call(bundle, key)) {
          require.register(key, bundle[key]);
        }
      }
    } else {
      modules[bundle] = fn;
      delete cache[bundle];
      addExtensions(bundle);
    }
  };

  require.list = function() {
    var list = [];
    for (var item in modules) {
      if (has.call(modules, item)) {
        list.push(item);
      }
    }
    return list;
  };

  var hmr = globals._hmr && new globals._hmr(_resolve, require, modules, cache);
  require._cache = cache;
  require.hmr = hmr && hmr.wrap;
  require.brunch = true;
  globals.require = require;
})();

(function() {
var global = typeof window === 'undefined' ? this : window;
var process;
var __makeRelativeRequire = function(require, mappings, pref) {
  var none = {};
  var tryReq = function(name, pref) {
    var val;
    try {
      val = require(pref + '/node_modules/' + name);
      return val;
    } catch (e) {
      if (e.toString().indexOf('Cannot find module') === -1) {
        throw e;
      }

      if (pref.indexOf('node_modules') !== -1) {
        var s = pref.split('/');
        var i = s.lastIndexOf('node_modules');
        var newPref = s.slice(0, i).join('/');
        return tryReq(name, newPref);
      }
    }
    return none;
  };
  return function(name) {
    if (name in mappings) name = mappings[name];
    if (!name) return;
    if (name[0] !== '.' && pref) {
      var val = tryReq(name, pref);
      if (val !== none) return val;
    }
    return require(name);
  }
};
require.register("js/components/helper.js", function(exports, require, module) {
/* global AFRAME, THREE */

AFRAME.registerComponent('hotspot-helper', {
  schema: {
    target: {type: 'selector'},
    distance: {type: 'number', default: 5},
    distanceIncrement: {type: 'number', default: 0.25},
  },

  init: function () {
    if (!this.data.target) {
      console.error('Hotspot-helper: You must specify a target element!');
      return;
    }

    var self = this;

    this.camera = document.querySelector('[camera]');
    this.targetRotationOrigin = this.data.target.getAttribute('rotation');
    this.targetPositionOrigin = this.data.target.getAttribute('position');

    // Helper UI.
    var uiContainer = this.makeUi();
    document.body.appendChild(uiContainer);

    // Enabled.
    this.enabled = uiContainer.querySelector('#hh-enabled');
    this.enabled.addEventListener('click', function () {
      uiContainer.dataset.enabled = !!self.enabled.checked;
    });

    // Set distance.
    var distanceInput = this.distanceInput = uiContainer.querySelector('#hh-distance');
    distanceInput.addEventListener('input', function () {
      self.updateDistance(this.value);
    });
    distanceInput.value = this.data.distance;

    // Copy position to clipboard.
    var copyPosition = uiContainer.querySelector('#hh-copy-position');
    copyPosition.addEventListener('click', function () {
      self.copyToClipboard(self.position);
    });

    // Mouse-wheel distance.
    window.addEventListener('wheel', this.handleWheel.bind(this));

    // Rotation.
    this.rotation = uiContainer.querySelector('#hh-rotation');

    // Copy rotation to clipboard.
    var copyRotation = uiContainer.querySelector('#hh-copy-rotation');
    copyRotation.addEventListener('click', function () {
      self.copyToClipboard(self.rotation);
    });

    // Look at.
    this.lookToggle = uiContainer.querySelector('#hh-lookat');

    // Position.
    this.position = uiContainer.querySelector('#hh-position');

    // Empty object3D for position.
    var targetObject = this.targetObject = new THREE.Object3D();
    this.dolly = new THREE.Object3D();
    this.dolly.add(targetObject);
    this.el.object3D.add(this.dolly);
    this.updateDistance(this.data.distance);

    // Set positioning on target so that clicks are not triggered when placing hotspot.
    this.data.target.setAttribute('hotspot', {positioning: true});
  },

  makeUi: function () {
    var uiContainer = document.createElement('div');
    uiContainer.id = 'hh';
    var markup = `
    <style>
      #hh-heading {
        font-family: Consolas, Andale Mono, monospace;
      }

      #hh {
        background: #333;
        color: #fff;
        font-family: Helvetica, Arial, sans-serif;
        left: 0;
        margin: 10px;
        padding: 10px;
        position: absolute;
        top: 0;
      }

      #hh h1 {
        margin: 0;
      }

      #hh h2 {
        font-weight: 200;
        margin: 10px 0;
      }

      #hh[data-enabled="false"] section {
        display: none;
      }

      #hh section {
        margin: 20px 0;
      }

      #hh .hh-check,
      #hh .hh-tip {
        display: block;
        font-size: .75rem;
        margin: 8px 0;
      }

      #hh .hh-tip {
        color: rgb(148,148,148);
      }

      #hh input[type="text"] {
        border: none;
        background: rgb(108,108,108);
        color: #fff;
        padding: 5px;
      }

      #hh input[type="button"] {
        background: #fff;
        border: none;
        padding: 5px;
      }

      #hh input[type="button"]:active {
        background: rgb(47,77,135);
        color: #fff;
      }
    </style>

    <h1 id="hh-heading" class="hh-heading">hotspot-helper</h1>

    <span class="hh-check">
      <label>
        <input id="hh-enabled" type="checkbox" checked> Enabled
      </label>
    </span>

    <section>
      <label>
        <input id="hh-distance" size="5" type="text"> Hotspot distance
        <span class="hh-tip">Use mouse scroll to adjust distance</span>
      </label>
    </section>

    <section>
      <label>
        <h2>Position</h2>
        <input id="hh-position" size="20" type="text" value="1.000 1.000 1.000">
        <input id="hh-copy-position" type="button" value="Copy to Position">
      </label>
    </section>

    <section>
      <h2><label for="hh-rotation">Rotation</label></h2>
      <input id="hh-rotation" size="20" type="text" value="1.000 1.000 1.000">
      <input id="hh-copy-rotation" type="button" value="Copy to Rotation">
      <label>
        <span class="hh-check">
          <input id="hh-lookat" type="checkbox"> Look at origin
        </span>
      </label>
    </section>
    `;
    uiContainer.innerHTML = markup;
    return uiContainer;
  },

  updateDistance: function (distance) {
    this.targetObject.position.z = -distance;
  },

  copyToClipboard: function (input) {
    input.select();
    document.execCommand('copy');
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }
  },

  handleWheel: function (e) {
    var input = this.distanceInput;
    var data = this.data;
    var increment = e.deltaY < 0 ? data.distanceIncrement : -data.distanceIncrement;
    var value = parseFloat(input.value) + increment;
    if (value < 0) {
      value = 0;
    }
    input.value = value;
    this.updateDistance(value);
  },

  updateRotation: function () {
    var target = this.data.target;
    if (this.lookToggle.checked) {
      if (!target.hasAttribute('look-at')) {
        target.setAttribute('look-at', '[camera]');
      }
      var worldRotation = this.data.target.object3D.getWorldRotation();
      this.rotation.value = this.toDeg(worldRotation.x).toFixed(2) + ' ' + this.toDeg(worldRotation.y).toFixed(2) + ' ' + this.toDeg(worldRotation.z).toFixed(2);
    } else {
      if (target.hasAttribute('look-at')) {
        target.removeAttribute('look-at');
      }
      this.rotation.value = `${this.targetRotationOrigin.x} ${this.targetRotationOrigin.y} ${this.targetRotationOrigin.z}`;
      target.setAttribute('rotation', this.targetRotationOrigin);
    }
  },

  toDeg: function (rad) {
    return rad * 180 / Math.PI;
  },

  tick: function () {
    var target = this.data.target;
    if (!target) return;
    if (this.enabled.checked) {
      var rotation = this.camera.object3D.getWorldRotation();
      this.dolly.rotation.copy(rotation);
      var position = this.targetObject.getWorldPosition();
      var cords = position.x.toFixed(2) + ' ' + position.y.toFixed(2) + ' ' + position.z.toFixed(2);
      target.setAttribute('position', {
        x: position.x,
        y: position.y,
        z: position.z
      });
      this.position.value = cords;
      this.updateRotation();
    } else {
      target.setAttribute('position', this.targetPositionOrigin);
      target.setAttribute('rotation', this.targetRotationOrigin);
    }
  }
});

});

require.register("js/components/hotspot.js", function(exports, require, module) {
AFRAME.registerPrimitive('a-hotspot', {
  defaultComponents: {
    hotspot: {}
  },
  mappings: {
    for: 'hotspot.for',
    to: 'hotspot.to'
  }
});

AFRAME.registerComponent('hotspot', {
  schema: {
    for: { type: 'string' },
    to: { type: 'string' },
    positioning: { type: 'boolean', default: false }
  },

  init: function () {
    this.tour = document.querySelector('a-tour');
    this.el.addEventListener('click', this.handleClick.bind(this));
  },

  handleClick: function () {
    if (this.data.positioning) return;
    var tour = this.tour.components['tour'];

    tour.loadSceneId(this.data.to);
  }
});
});

require.register("js/components/panorama.js", function(exports, require, module) {
AFRAME.registerPrimitive('a-panorama', {
  defaultComponents: {
    panorama: {}
  }
});

AFRAME.registerComponent('panorama', {
  schema: {
    rotation: { type: 'vec3' },
    src: { type: 'string' }
  }
});
});

require.register("js/components/tour.js", function(exports, require, module) {
AFRAME.registerPrimitive('a-tour', {
  defaultComponents: {
    tour: {}
  }
});

AFRAME.registerComponent('tour', {
  init: function () {
    this.sky = document.createElement('a-sky');
    this.el.appendChild(this.sky);
    var images = Array.prototype.slice.call(this.el.querySelectorAll('a-panorama'));
    if (images.length === 0) {
      console.error('You need to specify at least 1 image!');
      return;
    }
    var start = images[0];
    this.loadSceneId(start.getAttribute('id'));
  },

  loadSceneId: function(id) {
    this.loadImage(this.el.querySelector('a-panorama#' + id));
    this.setHotspots(id);
  },

  loadImage: function (image) {
    var sky = this.sky;
    sky.setAttribute('src', image.getAttribute('src'));
    var camera = this.el.sceneEl.camera.el;
    camera.setAttribute('rotation', image.getAttribute('rotation'));
  },

  setHotspots: function(id) {
    var hotspots = Array.prototype.slice.call(this.el.querySelectorAll('a-hotspot'));
    hotspots.forEach(function (spot) {
      var visible = spot.getAttribute('for') == id ? true : false;
      spot.setAttribute('visible', visible);
    })
  }
});

});

require.register("js/initialize.js", function(exports, require, module) {
require('aframe-look-at-component');
// require('platform');
// require('aframe-always-fullscreen-component');
require('./components/tour');
require('./components/panorama');
require('./components/hotspot');
require('./components/helper');

document.addEventListener('DOMContentLoaded', () => {
  console.log('Initialized app');
});

});

require.alias("aframe-cli/node_modules/buffer/index.js", "buffer");
require.alias("aframe-cli/node_modules/process/browser.js", "process");process = require('process');require.register("___globals___", function(exports, require, module) {
  

// Auto-loaded modules from config.npm.globals.
window.AFRAME = require("aframe");


});})();require('___globals___');

require('js/initialize.js');
//# sourceMappingURL=bundle.js.map