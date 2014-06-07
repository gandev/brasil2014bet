Meteor.subscribe('userRankings');
Meteor.subscribe('allMatches');
Meteor.subscribe('myBets');

var matchTypes = [{
  text: 'Gruppe A',
  clazz: 'group-a'
}, {
  text: 'Gruppe B',
  clazz: 'group-b'
}, {
  text: 'Gruppe C',
  clazz: 'group-c'
}, {
  text: 'Gruppe D',
  clazz: 'group-d'
}, {
  text: 'Gruppe E',
  clazz: 'group-e'
}, {
  text: 'Gruppe F',
  clazz: 'group-f'
}, {
  text: 'Gruppe G',
  clazz: 'group-g'
}, {
  text: 'Gruppe H',
  clazz: 'group-h'
}, {
  text: 'Achtelfinale',
  clazz: 'group-a'
}, {
  text: 'Viertelfinale',
  clazz: 'quarterfinals'
}, {
  text: 'Halbfinale',
  clazz: 'halffinals'
}, {
  text: 'Spiel um Platz 3',
  clazz: 'game-place3'
}, {
  text: 'Finale',
  clazz: 'final'
}];

var isAdmin = function () {
  var user = Meteor.user();
  return user && user.profile && user.profile.isAdmin;
};

UI.body.helpers({
  matchTypes: function() {
    return matchTypes;
  },
  matchesByType: function() {
    return Matches.find({
      type: this.text.toString()
    });
  },
  rankingSiteActive: function() {
    return Session.get('rankingSiteActive') ? 'active' : null;
  },
  rankings: function() {
    currentPoints = undefined;
    currentPlace = 0;

    var rankings = Rankings.find().fetch();
    rankings = _.sortBy(rankings, function(ranking) {
      return -ranking.points;
    });

    var lastPoints;
    var place = 0;
    _.each(rankings, function(ranking, index) {
      if (lastPoints === undefined || lastPoints !== ranking.points) {
        place++;
        lastPoints = ranking.points;
      }
      ranking.place = place + ".";
    });

    return rankings;
  },
  flagOfTeam: function(team) {
    team = this["team" + team];
    _.each(['ü', 'ä', 'ö'], function(umlaut, index) {
      if (team.indexOf(umlaut) >= 0) {
        var conversion;
        if (index === 0) {
          conversion = 'ue';
        } else if (index === 1) {
          conversion = 'ae';
        } else if (index === 2) {
          conversion = 'oe';
        }
        team = team.replace(umlaut, conversion);
      }
    });
    return team;
  },
  noCurrentUserOrAdmin: function () {
    var user = Meteor.user();
    if(user) {
      if(isAdmin()) {
        return true;
      } else {
        return false;
      }
    } else {
      return true;
    }
  },
  userIsAdmin: function () {
    return isAdmin();
  },
  editing: function() {
    return Session.equals('editing_result', this._id);
  }
});

UI.body.events({
  'click #loginUser': function(evt, tmpl) {
    evt.preventDefault();

    var user_input = tmpl.$('#username');
    var pw_input = tmpl.$('#password');

    var username = user_input.val();
    var password = pw_input.val();

    if(Meteor.userId()) {
      Meteor.call("createNewUser", username, password, function(err, result) {
        console.log(err, result);

        if(!err) {
          user_input.val('');
          pw_input.val('');
        }
      });
    } else {
      Meteor.loginWithPassword(username, password, function (err) {
        if(!err) {
          user_input.val('');
          pw_input.val('');
        }
      });
    }
  },
  'click #betSiteNav': function(evt, tmpl) {
    Session.set('rankingSiteActive', false);
  },
  'click #rankingSiteNav': function(evt, tmpl) {
    Session.set('rankingSiteActive', true);
  },
  'dblclick .live-edit-result': function(evt, tmpl) {
    if(isAdmin()) {
      Session.set('editing_result', this._id);
      Deps.flush(); // force DOM redraw, so we can focus the edit field
      activateInput(tmpl.find(".live-edit-input"));
    }
  }
});

UI.body.events(okCancelEvents(
  '.live-edit-input', {
    ok: function(value) {
      Matches.update(this._id, {
        $set: {
          result: value
        }
      });
      Session.set('editing_result', null);
    },
    cancel: function() {
      Session.set('editing_result', null);
    }
  }));

Template.myBet.helpers({
  currentBet: function() {
    return Bets.findOne({
      match: this._id
    });
  },
  myPoints: function() {
    return '[' + (isNaN(this.points) ? 'Ergebnis fehlt!' : '' + this.points) +
      ' Punkt(e)]';
  }
});

Template.myBet.events({
  'click .apply-bet': function(evt, tmpl) {
    var b1 = tmpl.$('.bet-team1').val();
    var b2 = tmpl.$('.bet-team2').val();

    var b1_overtime = tmpl.$('.bet-team1-overtime').val();
    var b2_overtime = tmpl.$('.bet-team2-overtime').val();

    var b1_eleven = tmpl.$('.bet-team1-eleven').val();
    var b2_eleven = tmpl.$('.bet-team2-eleven').val();

    Meteor.call('applyBet', this, b1, b2, b1_overtime, b2_overtime,
      b1_eleven, b2_eleven, function(err, result) {
        console.log(err, result);
      });
  },
  'click .remove-bet': function(evt, tmpl) {
    Bets.remove(this._id);
  }
});
