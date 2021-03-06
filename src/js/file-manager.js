'use strict'


var util = require('./util');
var notify = require('./notify');


plupload.addFileFilter('no_executables', function (arg, file, cb) {
  switch (file.type) {
  case 'application/x-msdownload':
  case 'application/x-msdos-program':
  case 'application/x-msdos-windows':
  case 'application/x-download':
  case 'application/bat':
  case 'application/x-bat':
  case 'application/com':
  case 'application/x-com':
  case 'application/exe':
  case 'application/x-exe':
  case 'application/x-winexe':
  case 'application/x-winhlp':
  case 'application/x-winhelp':
  case 'application/x-javascript':
  case 'application/hta':
  case 'application/x-ms-shortcut':
  case 'application/octet-stream':
  case 'vms/exe':
    this.trigger('Error', {
      code: plupload.FILE_EXTENSION_ERROR,
      message: plupload.translate('Cannot upload executable.'),
      file: file
    });

    cb(false);
    break;

  default: cb(true); break;
  }
})


module.exports = {
  replace: true,
  template: '#file-manager-template',
  paramAttributes: ['files', 'can-edit'],
  components: {'bb-file': require('./file')},


  data: function () {
    return {
      canEdit: false
    }
  },


  watch: {
    canEdit: function (newValue, oldValue) {
      if (newValue) this.initUploader({
        filters: {
          max_file_size: '32mb',
          no_executables: true,
          prevent_duplicates: true
        }
      })
    }
  },


  events: {
    'file-manager.can-edit': function (canEdit) {
      this.$set('canEdit', canEdit);
    },


    'file-editor.cancel': function () {
      return false;
    }
  },


  methods: {
    // From protect-page
    canLeave: function () {
      for (var i = 0; i < this.files.length; i++)
        if (this.files[i].uploading) return false;

      return true
    },


    onLeave: function (response, defer) {
      var resolve = true;

      if (response == 'abort') {
        for (var i = 0; i < this.files.length; i++) {
          var file = this.files[i];

          if (file.uploading && file.future_url) {
            resolve = false;

            this.$dispatch('file-manager.delete', file, function () {
              this.removeFile(file);
              file.state = 'deleted';
              defer.resolve();
            }.bind(this));

          } else if (file.uploading) {
            this.removeFile(file);
            file.state = 'deleted';
          }
        }
      }

      if (resolve) defer.resolve()
    },


    removeFile: function (file) {
      this.files.splice(this.files.indexOf(file), 1);
    },


    findFile: function (filename) {
      for (var i = 0; i < this.files.length; i++)
        if (this.files[i].name == filename) return this.files[i];
    },


    fileUpdated: function (file) {
      // HACK Remove and read file to force it to reload
      var self = this;
      var index = this.files.indexOf(file);
      this.files.splice(index, 1);
      Vue.nextTick(function () {self.files.splice(index, 0, file)})
    },


    onBeforeUpload: function (file, done) {
      function cb(success, data) {
        if (success) {
          file.state = 'uploading';
          file.future_url = data.file_url;
          done(true, data.upload_url, data.post);

        } else {
          this.removeFile(file);
          done(false);
        }
      }

      this.$dispatch('file-manager.before-upload', file, cb.bind(this));
    },


    onFileAdded: function (file) {
      var other = this.findFile(file.name);
      if (other) {
        this.uploader.trigger('Error', {
          code: plupload.FILE_DUPLICATE_ERROR,
          message:
          plupload.translate('File "' + file.name + '" already exists.'),
          file: file
        })

        this.uploader.stop();
        this.uploader.removeFile(file);
        this.uploader.start();

        return;
      }

      file.state = 'waiting';
      file.uploading = true;
      file.percent = 0;
      file.downloads = 0;
      this.files.push(file);

      // Preload thumbnail
      if (util.isImage(file)) {
        var preloader = new mOxie.Image();

        preloader.onload = function () {
          preloader.downsize(64, 64);
          file.src = preloader.getAsDataURL();
        }

        preloader.load(file.getSource());
      }
    },


    onFileUploaded: function (file) {
      function cb(success, data) {
        if (success) {
          file.state = 'ok';
          file.uploading = false;
          file.url = file.future_url;
          this.fileUpdated(file);

        } else {
          this.removeFile(file);
          file.state = 'deleted';
        }
      }

      this.$dispatch('file-manager.after-upload', file, cb.bind(this));
    },


    onUp: function (file) {
      function cb(success) {
        if (success) {
          var index = this.files.indexOf(file);
          if (index)
            this.files.splice(index - 1, 0, this.files.splice(index, 1)[0]);
        }
      }

      this.$dispatch('file-manager.up', file, cb.bind(this));
    },


    onDown: function (file) {
      function cb(success) {
        if (success) {
          var index = this.files.indexOf(file)
          if (index < this.files.length)
            this.files.splice(index + 1, 0, this.files.splice(index, 1)[0]);
        }
      }

      this.$dispatch('file-manager.down', file, cb.bind(this));
    },


    onDelete: function (file) {
      file.state = 'deleting';

      function cb(success) {
        if (success) {
          this.removeFile(file);
          file.state = 'deleted';

        } else file.state = 'ok';
      }

      this.$dispatch('file-manager.delete', file, cb.bind(this));
    },


    onError: function (error) {
      notify.error('Upload failure', error.message);
      console.debug('Upload error:', JSON.stringify(error));
    }
  },


  mixins: [
    require('./upload')('/'),

    require('./protect-page')({
      unload: {
        message: 'File upload in progress.  Are you sure you want to leave?'
      },

      leave: {
        type: 'question',
        title: 'Abort upload?',
        body: 'Upload in progress.  Would you like to stay on this page and ' +
          'continue or leave and abort the upload?',
        buttons: [
          {label: 'Abort', icon: 'trash-o', response: 'abort'},
          {label: 'Continue', klass: 'success', icon: 'upload'}
        ]
      }
    })
  ]
}
