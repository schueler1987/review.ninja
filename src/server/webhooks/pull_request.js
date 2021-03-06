// models
var Repo = require('mongoose').model('Repo');
var User = require('mongoose').model('User');

//services
var github = require('../services/github');
var url = require('../services/url');
var notification = require('../services/notification');
var status = require('../services/status');

//////////////////////////////////////////////////////////////////////////////////////////////
// Github Pull Request Webhook Handler
//////////////////////////////////////////////////////////////////////////////////////////////

module.exports = function(req, res) {

    Repo.with({
        uuid: req.args.repository.id
    }, function(err, repo) {

        if(err) {
            return;
        }

        if(repo.ninja) {

            var args = {
                user: req.args.repository.owner.login,
                repo: req.args.repository.name,
                repo_uuid: req.args.repository.id,
                sha: req.args.pull_request.head.sha,
                number: req.args.number,
                token: repo.token
            };

            var notification_args = {
                slug: req.args.repository.full_name,
                number: req.args.number,
                sender: req.args.sender,
                review_url: url.reviewPullRequest(req.args.repository.owner.login, req.args.repository.name, req.args.number)
            };

            var actions = {
                opened: function() {

                    status.update(args, function(err, data) {});

                    notification.sendmail('pull_request_opened',
                                          req.args.repository.owner.login,
                                          req.args.repository.name,
                                          repo.uuid,
                                          repo.token,
                                          req.args.number,
                                          notification_args);

                },
                synchronize: function() {

                    status.update(args, function(err, data) {});

                    notification.sendmail(
                                          'pull_request_synchronized',
                                          req.args.repository.owner.login,
                                          req.args.repository.name,
                                          repo.uuid,
                                          repo.token,
                                          req.args.number,
                                          notification_args);

                },
                closed: function() {
                    // a pull request you have been reviewing has closed

                    if(req.args.pull_request.merged) {
                        
                        io.emit(req.args.repository.owner.login + ':' + req.args.repository.name + ':pull-request-'+req.args.number +':merged', req.args.pull_request.merged);
                    }
                },
                reopened: function() {
                    // a pull request you have reviewed has a been reopened
                    // send messages to responsible users?
                }
            };

            if (actions[req.args.action]) {
                actions[req.args.action]();
            }
        }
    });

    res.end();
};
