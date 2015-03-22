'use strict'


var $bb = require('./buildbotics');
var page = require('page');
var notify = require('./notify');
var util = require('./util');

var subsections = 'view edit-details edit-picture edit-bio'


module.exports = {
  template: '#profile-template',


  components: {
    'profile-avatar-editor': require('./profile-avatar-editor'),
    'profile-details-editor': require('./profile-details-editor'),
    'profile-bio-editor': require('./profile-bio-editor')
  },


  data: function  () {
    return {
      viewSections: 'creations starred followers following activity'.split(' '),
      modified: false
    }
  },


  events: {
    'logged-in': function (user) {
      this.$set('isFollowing', require('./app').isFollowing(this.profile.name))
    }
  },


  created: function () {
    var self = this;
    var app = require('./app');

    // Import profile data
    $.each(app.profileData, function (key, value) {self.$add(key, value)});
  },


  methods: {
    getSubsectionTitle: function (subsection) {
      return subsection.replace(/^edit-/, '');
    },


    // From login-listener
    getOwner: function () {
      return this.profile.name;
    },


    getEditSubsections: function () {
      return this.subsections.filter(function (value) {return value != 'view'})
    },


    create: function () {
      page('/create');
    },


    editProfile: function (section) {
      if (typeof section != 'string') section = 'details';
      location.hash = 'edit-' + section;
    }
  },


  mixins: [
    require('./subsections')('profile', subsections),
    require('./login-listener')
  ]
}
