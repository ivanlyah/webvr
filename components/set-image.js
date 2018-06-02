/* global AFRAME */

/**
 * Component that listens to an event, fades out an entity, swaps the texture, and fades it
 * back in.
 */
AFRAME.registerComponent('set-image', {
  schema: {
    on    : { type: 'string' },
    target: { type: 'selector' },
    src   : { type: 'string' },
    dur   : { type: 'number', default: 300 }
  },

  init: function () {
    var data = this.data;
    var el = this.el;

    this.setupFadeAnimation();

    el.addEventListener(data.on, function () {
      // Fade out image.
      data.target.emit('set-image-fade');
      // Wait for fade to complete.
      setTimeout(function () {
        // Set image.
        data.target.setAttribute('material', 'src', data.src);

        document.querySelectorAll('.link').forEach(el => {
          el.setAttribute('material', 'color', '#333');
          el.setAttribute('material', 'opacity', '.8');
        });

        document.querySelector('.link[data-target="' + data.src + '"]').setAttribute('material', 'color', '#a7f5a6');
        document.querySelector('.link[data-target="' + data.src + '"]').setAttribute('material', 'opacity', '.4');
      }, data.dur);
    });
  },

  /**
   * Setup fade-in + fade-out.
   */
  setupFadeAnimation: function () {
    var data = this.data;
    var targetEl = this.data.target;

    // Only set up once.
    if (targetEl.dataset.setImageFadeSetup) {
      return;
    }

    targetEl.dataset.setImageFadeSetup = true;

    // Create animation.
    targetEl.setAttribute('animation__fade', {
      property   : 'material.color',
      startEvents: 'set-image-fade',
      dir        : 'alternate',
      dur        : data.dur,
      from       : '#FFF',
      to         : '#000',
      loop       : false
    });
  }
});
