// modules
var parse = require('parse-diff');
// models
var Repo = require('mongoose').model('Repo');

module.exports = {
    
    compareCommits: function(req, comp, done) {
        comp.files.forEach(function(file) {
            try {
                file.patch = parse(file.patch);
            }
            catch(ex) {
                file.patch = null;
            }
        });

        done(null, comp);
    }
};