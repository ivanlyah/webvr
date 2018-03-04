const ghpages = require('gh-pages');

ghpages.publish('.public', err => {
  if (err) {
    console.error('Error to publish GitHub pages. Details: ', err);
  }

  console.log('GitHub pages published!');
});
