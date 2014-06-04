/*

 TEST QUERIES:

 Accounts.createUser({username: 'test', password: 'test123'});
 Meteor.loginWithPassword('test', 'test123');

 Matches.update(Matches.findOne({type: 'Gruppe A'})._id, {'$set': {result: "1:2"}})
 Matches.update(Matches.findOne({type: 'Gruppe A'})._id, {'$set': {start: "15.05.2014	18:00"}})

*/

Rankings = new Meteor.Collection('rankings');
Matches = new Meteor.Collection('matches');
Bets = new Meteor.Collection('bets');

if (Meteor.isClient) {
  Meteor.subscribe('userRankings');
  Meteor.subscribe('allMatches');
  Meteor.subscribe('myBets');

  UI.body.helpers({
    matchTypes: ['Gruppe A',
                 'Gruppe B',
                 'Gruppe C',
                 'Gruppe D',
                 'Gruppe E',
                 'Gruppe F',
                 'Gruppe G',
                 'Gruppe H',
                 'Achtelfinale',
                 'Viertelfinale',
                 'Halbfinale',
                 'Spiel um Platz 3',
                 'Finale'],
    matchesByType: function () {
      return Matches.find({type: this.toString()});
    },
    rankingSiteActive: function () {
      return Session.get('rankingSiteActive') ? 'active': null;
    },
    rankings: function () {
      var rankings = Rankings.find().fetch();
      rankings = _.sortBy(rankings, function (ranking) {
        return -ranking.points;
      });
      return rankings;
    }
  });

  UI.body.events({
    'click #loginUser': function (evt, tmpl) {
      var username = tmpl.$('#username').val();
      var password = tmpl.$('#password').val();

      Meteor.loginWithPassword(username, password);
    },
    'click #betSiteNav': function (evt, tmpl) {
      Session.set('rankingSiteActive', false);
    },
    'click #rankingSiteNav': function (evt, tmpl) {
      Session.set('rankingSiteActive', true);
    }
  });

  Template.myBet.helpers({
    currentBet: function () {
      return Bets.findOne({match: this._id});
    },
    myPoints: function () {
      return '[' + (isNaN(this.points) ? 'Ergebnis fehlt!': '' + this.points) + ' Punkt(e)]';
    }
  });

  Template.myBet.events({
    'click .apply-bet': function (evt, tmpl) {
      var b1 = tmpl.$('.bet-team1').val();
      var b2 = tmpl.$('.bet-team2').val();

      var b1_overtime = tmpl.$('.bet-team1-overtime').val();
      var b2_overtime = tmpl.$('.bet-team2-overtime').val();

      var b1_eleven = tmpl.$('.bet-team1-eleven').val();
      var b2_eleven = tmpl.$('.bet-team2-eleven').val();

      Meteor.call('applyBet', this, b1, b2, b1_overtime, b2_overtime, b1_eleven, b2_eleven, function (err, result) {
        console.log(err, result);
      });
    },
    'click .remove-bet': function (evt, tmpl) {
      Bets.remove(this._id);
    }
  });
}

if (Meteor.isServer) {
  Meteor.publish('myBets', function () {
    return Bets.find({user: this.userId});
  });

  Meteor.publish('allMatches', function () {
    return Matches.find();
  });

  Meteor.publish('userRankings', function () {
    var self = this;
    var pointsByUser = {};
    var initializing = true;
    var handle = Bets.find().observe({
      added: function (bet) {
          if(isNaN(pointsByUser[bet.user])) {
            pointsByUser[bet.user] = 0;
            if(!initializing) {
              self.added('rankings', bet.user,  {user: Meteor.users.findOne(bet.user).username, points: 0});
            }
          }

          if(!isNaN(bet.points)) {
            pointsByUser[bet.user] = pointsByUser[bet.user] + bet.points;
          }
      },
      changed: function (newBet, oldBet) {
        var oldPoints = isNaN(oldBet.points) ? 0: oldBet.points;
        var newPoints = isNaN(newBet.points) ? 0: newBet.points;

        var points = (pointsByUser[newBet.user] - oldPoints) + newPoints;
        pointsByUser[newBet.user] = points;
        self.changed('rankings', newBet.user,  {points: points});
      }
    });

    initializing = false;

    for(var uid in pointsByUser) {
      if(pointsByUser.hasOwnProperty(uid)) {
        self.added('rankings', uid,  {user: Meteor.users.findOne(uid).username, points: pointsByUser[uid]});
      }
    }
    self.ready();

    self.onStop(function () {
      handle.stop();
    });
  });

  Bets.allow({
    remove: function (userId, doc) {
      return doc.user === userId;
    }
  });

  var parseStartTime = function (match_time) {
    return moment(match_time, 'DD.MM.YYYY  HH:mm');
  };

  var timeIsUp = function (match_time) {
    var m = parseStartTime(match_time);
    m.subtract('minutes', 10);

    return !moment().isBefore(m);
  };

  var calculatePoints = function(result, bet) {
    if(result === bet) {
      return 3;
    }

    var result_split = result.split(':');
    var result_t1 = parseInt(result_split[0], 10);
    var result_t2 = parseInt(result_split[1], 10);

    var bet_result_split = bet.split(':');
    var bet_result_t1 = parseInt(bet_result_split[0], 10);
    var bet_result_t2 = parseInt(bet_result_split[1], 10);

    if(result_t1 > result_t2 && bet_result_t1 > bet_result_t2 ||
       result_t1 < result_t2 && bet_result_t1 < bet_result_t2 ||
       result_t1 === result_t2 && bet_result_t1 === bet_result_t2) {
      return 1;
    } else {
      return 0;
    }
  };

  Meteor.startup(function () {
    Meteor.setInterval(function () {
      var matches = Matches.find().fetch();

      _.each(matches, function (match) {
          Matches.update(match._id, {'$set': {timeIsUp: timeIsUp(match.start),
            remainingTime: '(' + parseStartTime(match.start).fromNow() + ')'}});
      });
    }, 2000); //TODO increase time!?

    Matches.find().observe({
      changed: function (newMatch, oldMatch) {
        if(newMatch.result) {
          var betsByMatch = Bets.find({match: newMatch._id}).fetch();

          _.each(betsByMatch, function (bet) {
            var points;

            if(newMatch.result && bet.result) {
              points = 0;
              points += calculatePoints(newMatch.result, bet.result);
            }

            if(newMatch.result_overtime && bet.result_overtime && points !== undefined) {
              points += calculatePoints(newMatch.result_overtime, bet.result_overtime);
            }

            if(newMatch.result_eleven && bet.result_eleven && points !== undefined) {
              points += calculatePoints(newMatch.result_eleven, bet.result_eleven);
            }

            Bets.update(bet._id, {'$set': {points: points}});
          });
        }
      }
    });
  });

  Meteor.methods({
      applyBet: function (match, b1, b2, b1_overtime, b2_overtime, b1_eleven, b2_eleven) {
        if(this.userId && !timeIsUp(match.start)) {
          Bets.upsert({match: match._id, user: this.userId}, {match: match._id,
            user: this.userId,
            result: b1 + ':' + b2,
            result_overtime: (b1_overtime && b2_overtime && b1 === b2 ? b1_overtime + ':' + b2_overtime: null),
            result_eleven: (b1_eleven && b2_eleven && b1_overtime === b2_overtime ? b1_eleven + ':' + b2_eleven: null)
          });
          return true;
        } else {
          throw new Meteor.Error(999, 'NO! Time is up!');
        }
      }
  });

  Meteor.startup(function () {

    if(Matches.find().count() === 0) {

      //GRUPPE A
      Matches.insert({
        type: 'Gruppe A',
        start: '12.06.2014	22:00',
        team1: 'Brasilien',
        team2: 'Kroatien',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe A',
        start: '13.06.2014	18:00',
        team1: 'Mexico',
        team2: 'Kamerun',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe A',
        start: '17.06.2014	21:00',
        team1: 'Brasilien',
        team2: 'Mexico',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe A',
        start: '19.06.2014	00:00',
        team1: 'Kamerun',
        team2: 'Kroatien',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe A',
        start: '23.06.2014	22:00',
        team1: 'Kamerun',
        team2: 'Brasilien',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe A',
        start: '23.06.2014	22:00',
        team1: 'Kroation',
        team2: 'Mexiko',
        result: null,
        isFixed: true
      });

      //GRUPPE B
      Matches.insert({
        type: 'Gruppe B',
        start: '13.06.2014	21:00',
        team1: 'Spanien',
        team2: 'Niederlande',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe B',
        start: '14.06.2014	00:00',
        team1: 'Chile',
        team2: 'Australien',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe B',
        start: '18.06.2014	18:00',
        team1: 'Australien',
        team2: 'Niederlande',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe B',
        start: '18.06.2014	21:00',
        team1: 'Spanien',
        team2: 'Chile',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe B',
        start: '23.06.2014	18:00',
        team1: 'Australien',
        team2: 'Spanien',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe B',
        start: '23.06.2014	18:00',
        team1: 'Niederlande',
        team2: 'Chile',
        result: null,
        isFixed: true
      });

      //GRUPPE C
      Matches.insert({
        type: 'Gruppe C',
        start: '14.06.2014	18:00',
        team1: 'Kolumbien',
        team2: 'Griechenland',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe C',
        start: '15.06.2014	03:00',
        team1: 'Elfenbeinküste',
        team2: 'Japan',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe C',
        start: '19.06.2014	18:00',
        team1: 'Kolumbien',
        team2: 'Elfenbeinküste',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe C',
        start: '20.06.2014	00:00',
        team1: 'Japan',
        team2: 'Griechenland',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe C',
        start: '24.06.2014	22:00',
        team1: 'Japan',
        team2: 'Kolumbien',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe C',
        start: '24.06.2014	22:00',
        team1: 'Griechenland',
        team2: 'Elfenbeinküste',
        result: null,
        isFixed: true
      });

      //GRUPPE D
      Matches.insert({
        type: 'Gruppe D',
        start: '14.06.2014	21:00',
        team1: 'Uruguay',
        team2: 'Costa Rica',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe D',
        start: '15.06.2014	00:00',
        team1: 'England',
        team2: 'Italien',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe D',
        start: '19.06.2014	21:00',
        team1: 'Uruguay',
        team2: 'England',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe D',
        start: '20.06.2014	18:00',
        team1: 'Italien',
        team2: 'Costa Rica',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe D',
        start: '24.06.2014	18:00',
        team1: 'Costa Rica',
        team2: 'England',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe D',
        start: '24.06.2014	18:00',
        team1: 'Italien',
        team2: 'Uruguay',
        result: null,
        isFixed: true
      });

      //GRUPPE E
      Matches.insert({
        type: 'Gruppe E',
        start: '15.06.2014	18:00',
        team1: 'Schweiz',
        team2: 'Ecuador',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe E',
        start: '15.06.2014	21:00',
        team1: 'Frankreich',
        team2: 'Honduras',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe E',
        start: '20.06.2014	21:00',
        team1: 'Schweiz',
        team2: 'Frankreich',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe E',
        start: '21.06.2014	00:00',
        team1: 'Honduras',
        team2: 'Ecuador',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe E',
        start: '25.06.2014	22:00',
        team1: 'Honduras',
        team2: 'Schweiz',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe E',
        start: '25.06.2014	22:00',
        team1: 'Ecuador',
        team2: 'Frankreich',
        result: null,
        isFixed: true
      });

      //GRUPPE F
      Matches.insert({
        type: 'Gruppe F',
        start: '16.06.2014	00:00',
        team1: 'Argentinien',
        team2: 'Bosnien-Herzegowina',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe F',
        start: '16.06.2014	21:00',
        team1: 'Iran',
        team2: 'Nigeria',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe F',
        start: '21.06.2014	18:00',
        team1: 'Argentinien',
        team2: 'Iran',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe F',
        start: '22.06.2014	00:00',
        team1: 'Nigeria',
        team2: 'Bosnien-Herzegowina',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe F',
        start: '25.06.2014	18:00',
        team1: 'Nigeria',
        team2: 'Argentinien',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe F',
        start: '25.06.2014	18:00',
        team1: 'Bosnien-Herzegowina',
        team2: 'Iran',
        result: null,
        isFixed: true
      });

      //GRUPPE G
      Matches.insert({
        type: 'Gruppe G',
        start: '16.06.2014	18:00',
        team1: 'Deutschland',
        team2: 'Portugal',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe G',
        start: '17.06.2014	00:00',
        team1: 'Ghana',
        team2: 'USA',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe G',
        start: '21.06.2014	21:00',
        team1: 'Deutschland',
        team2: 'Ghana',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe G',
        start: '23.06.2014	00:00',
        team1: 'USA',
        team2: 'Portugal',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe G',
        start: '26.06.2014	18:00',
        team1: 'Portugal',
        team2: 'Ghana',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe G',
        start: '26.06.2014	18:00',
        team1: 'USA',
        team2: 'Deutschland',
        result: null,
        isFixed: true
      });

      //GRUPPE H
      Matches.insert({
        type: 'Gruppe H',
        start: '17.06.2014	18:00',
        team1: 'Belgien',
        team2: 'Algerien',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe H',
        start: '18.06.2014	00:00',
        team1: 'Russland',
        team2: 'Südkorea',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe H',
        start: '22.06.2014	18:00',
        team1: 'Belgien',
        team2: 'Russland',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe H',
        start: '22.06.2014	21:00',
        team1: 'Südkorea',
        team2: 'Algerien',
        result: null,
        isFixed: true
      });

      Matches.insert({
        type: 'Gruppe H',
        start: '26.06.2014	22:00',
        team1: 'Algerien',
        team2: 'Russland',
        result: null
      });

      Matches.insert({
        type: 'Gruppe H',
        start: '26.06.2014	22:00',
        team1: 'Südkorea',
        team2: 'Belgien',
        result: null,
        isFixed: true
      });

      //Achtelfinale
      Matches.insert({
        type: 'Achtelfinale',
        start: '28.06.2014	18:00',
        team1: 'Sieger Gruppe A',
        team2: 'Zweiter Gruppe B',
        result: null,
        result_overtime: null,
        result_eleven: null,
        isFixed: false,
        isFinals: true
      });

      Matches.insert({
        type: 'Achtelfinale',
        start: '28.06.2014	22:00',
        team1: 'Sieger Gruppe C',
        team2: 'Zweiter Gruppe D',
        result: null,
        result_overtime: null,
        result_eleven: null,
        isFixed: false,
        isFinals: true
      });

      Matches.insert({
        type: 'Achtelfinale',
        start: '29.06.2014	18:00',
        team1: 'Sieger Gruppe B',
        team2: 'Zweiter Gruppe A',
        result: null,
        result_overtime: null,
        result_eleven: null,
        isFixed: false,
        isFinals: true
      });

      Matches.insert({
        type: 'Achtelfinale',
        start: '29.06.2014	22:00',
        team1: 'Sieger Gruppe D',
        team2: 'Zweiter Gruppe C',
        result: null,
        result_overtime: null,
        result_eleven: null,
        isFixed: false,
        isFinals: true
      });

      Matches.insert({
        type: 'Achtelfinale',
        start: '30.06.2014	18:00',
        team1: 'Sieger Gruppe E',
        team2: 'Zweiter Gruppe F',
        result: null,
        result_overtime: null,
        result_eleven: null,
        isFixed: false,
        isFinals: true
      });

      Matches.insert({
        type: 'Achtelfinale',
        start: '30.06.2014	22:00',
        team1: 'Sieger Gruppe G',
        team2: 'Zweiter Gruppe H',
        result: null,
        result_overtime: null,
        result_eleven: null,
        isFixed: false,
        isFinals: true
      });

      Matches.insert({
        type: 'Achtelfinale',
        start: '01.07.2014	18:00',
        team1: 'Sieger Gruppe F',
        team2: 'Zweiter Gruppe E',
        result: null,
        result_overtime: null,
        result_eleven: null,
        isFixed: false,
        isFinals: true
      });

      Matches.insert({
        type: 'Achtelfinale',
        start: '01.07.2014	22:00',
        team1: 'Sieger Gruppe H',
        team2: 'Zweiter Gruppe G',
        result: null,
        result_overtime: null,
        result_eleven: null,
        isFixed: false,
        isFinals: true
      });

      //Viertelfinale
      Matches.insert({
        type: 'Viertelfinale',
        start: '04.07.2014	18:00',
        team1: 'Sieger AF 5',
        team2: 'Sieger AF 6',
        result: null,
        result_overtime: null,
        result_eleven: null,
        isFixed: false,
        isFinals: true
      });

      Matches.insert({
        type: 'Viertelfinale',
        start: '04.07.2014	22:00',
        team1: 'Sieger AF 1',
        team2: 'Sieger AF 2',
        result: null,
        result_overtime: null,
        result_eleven: null,
        isFixed: false,
        isFinals: true
      });

      Matches.insert({
        type: 'Viertelfinale',
        start: '05.07.2014	18:00',
        team1: 'Sieger AF 7',
        team2: 'Sieger AF 8',
        result: null,
        result_overtime: null,
        result_eleven: null,
        isFixed: false,
        isFinals: true
      });

      Matches.insert({
        type: 'Viertelfinale',
        start: '05.07.2014	22:00',
        team1: 'Sieger AF 3',
        team2: 'Sieger AF 4',
        result: null,
        result_overtime: null,
        result_eleven: null,
        isFixed: false,
        isFinals: true
      });

      //Halbfinale
      Matches.insert({
        type: 'Halbfinale',
        start: '08.07.2014	22:00',
        team1: 'Sieger VF 1',
        team2: 'Sieger VF 2',
        result: null,
        result_overtime: null,
        result_eleven: null,
        isFixed: false,
        isFinals: true
      });

      Matches.insert({
        type: 'Halbfinale',
        start: '09.07.2014	22:00',
        team1: 'Sieger VF 4',
        team2: 'Sieger VF 3',
        result: null,
        result_overtime: null,
        result_eleven: null,
        isFixed: false,
        isFinals: true
      });

      Matches.insert({
        type: 'Spiel um Platz 3',
        start: '12.07.2014	22:00',
        team1: 'Verlierer HF 1',
        team2: 'Verlierer HF 2',
        result: null,
        result_overtime: null,
        result_eleven: null,
        isFixed: false,
        isFinals: true
      });

      Matches.insert({
        type: 'Finale',
        start: '13.07.2014	21:00',
        team1: 'Sieger HF 1',
        team2: 'Sieger HF 2',
        result: null,
        result_overtime: null,
        result_eleven: null,
        isFixed: false,
        isFinals: true
      });
    }
  });
}
