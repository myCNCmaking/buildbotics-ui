'use strict'

var $bb = require('./buildbotics');
var notify = require('./notify');

var fields = 'title license tags';


module.exports = {
  replace: true,
  template: '#thing-details-editor-template',
  paramAttributes: ['thing'],


  ready: function () {
    // Get licenses
    this.$set('licenses', require('./app').licenses);
  },


  methods: {
    saveTags: function (tags) {
      var promises = [];

      // Find added tags
      var tag = [];
      for (var i = 0; i < tags.length; i++)
        if (this.thing.tags.indexOf(tags[i]) == -1)
          tag.push(tags[i]);

      if (tag.length)
        promises.push($bb.put(this.thing.api_url + '/tags/' + tag.join()));

      // Find removed tags
      var untag = [];
      for (var i = 0; i < this.thing.tags.length; i++)
        if (tags.indexOf(this.thing.tags[i]) == -1)
          untag.push(this.thing.tags[i]);

      if (untag.length)
        promises.push($bb.delete(this.thing.api_url + '/tags/' + untag.join()));

      return promises;
    },


    // From field-editor
    onProtectedSave: function (fields) {
      var promises = [];

      // Save any tags
      if (fields.tags) {
        promises = promises.concat(this.saveTags(fields.tags));
        delete fields.tags;
      }

      // Save other fields
      if (JSON.stringify(fields) != '{}')
        promises.push($bb.put(this.thing.api_url, fields).done(function () {
          // Update license URL
          if (fields.license)
            this.thing.license_url = this.getLicenseURL(fields.license);
        }.bind(this)));

      return $.when.apply($, promises)
        .fail(function () {notify.error('Failed to save details')})
    },


    getLicenseURL: function (license) {
      if (!this.licenses) return;

      for (var i = 0; i < this.licenses.length; i++)
        if (this.licenses[i].name == license)
          return this.licenses[i].url;
    },


    getLicenseDescription: function (license) {
      if (!this.licenses) return;

      for (var i = 0; i < this.licenses.length; i++) {
        var l = this.licenses[i];

        if (l.name == license)
          return l.description
            .replace('$name', '<a href="' + l.url + '" target="_blank">' +
                     l.name + "</a>");
      }

      return 'Please choose a license.'
    }
  },


  mixins: [
    require('./protected-field-editor')('thing', fields)
  ]
}
