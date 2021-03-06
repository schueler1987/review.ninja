// models
var Repo = require('mongoose').model('Repo');
var Star = require('mongoose').model('Star');

var github = require('../services/github');
var status = require('../services/status');
var notification = require('../services/notification');

module.exports = {

    /************************************************************************************************************

    @models

    + Star, where repo=repo_uuid, sha=sha

    ************************************************************************************************************/

    all: function(req, done) {

        Star.find({sha: req.args.sha, repo: req.args.repo_uuid}, function(err, stars) {
            done(err, stars);
        });

    },


    /************************************************************************************************************

    @models

    + Star, where repo=repo_uuid, sha=sha, user=user_uuid

    ************************************************************************************************************/

    get: function(req, done) {

        Star.with({
            sha: req.args.sha,
            user: req.user.id,
            repo: req.args.repo_uuid
        }, function(err, star) {
            done(err, star);
        });

    },

    /************************************************************************************************************

    @models

    + Star

    ************************************************************************************************************/

    set: function(req, done) {

        Repo.with({uuid: req.args.repo_uuid}, function(err, repo) {

            if(err){
                return done(err, repo);
            }

            github.call({
                obj: 'repos', 
                fun: 'one', 
                arg: { id: req.args.repo_uuid }, 
                token: req.user.token
            }, function(err, github_repo) {

                if(err) {
                    return done(err, github_repo);
                }

                if(!github_repo.permissions.pull) {
                    return done({
                        code: 403,
                        text: 'Forbidden'
                    });
                }

                Star.create({
                    sha: req.args.sha, 
                    user: req.user.id, 
                    repo: req.args.repo_uuid,
                    name: req.user.login
                }, function(err, star) {

                    if(star) {

                        io.emit(req.args.user + ':' + req.args.repo + ':pull-request-' + req.args.number + ':starred', {});

                        status.update({ 
                            user: req.args.user, 
                            repo: req.args.repo, 
                            sha: req.args.sha, 
                            repo_uuid: req.args.repo_uuid, 
                            number: req.args.number, 
                            token: req.user.token
                        }, function(err, res) {

                        });
                        var args = {
                          starrer: req.user.login,
                          number: req.args.number
                        };

                        notification.sendmail('star', req.args.user, req.args.repo, repo.uuid, repo.token, req.args.number, args);
                    }

                    done(err, star);
                });

            });

        });

    },

    /************************************************************************************************************

    @models

    + Star

    ************************************************************************************************************/

    rmv: function(req, done) {
        Repo.with({uuid: req.args.repo_uuid}, function(err, repo) {

            Star.with({
                sha: req.args.sha,
                user: req.user.id,
                repo: req.args.repo_uuid
            }, function(err, star) {

                if(err){
                    return done(err, star);
                }

                star.remove(function(err, star) {

                    if(star) {

                        io.emit(req.args.user + ':' + req.args.repo + ':pull-request-' + req.args.number + ':unstarred', {});

                        status.update({
                            user: req.args.user, 
                            repo: req.args.repo, 
                            repo_uuid: req.args.repo_uuid, 
                            sha: req.args.sha, 
                            number: req.args.number, 
                            token: req.user.token
                        }, function(err, res) {
                            
                        });
                        
                        var args = {
                          starrer: req.user.login,
                          number: req.args.number
                        };

                        notification.sendmail('unstar', req.args.user, req.args.repo, repo.uuid, repo.token, req.args.number, args);

                    }

                    done(err, star);
                });
            });
        });
    }
};
