Accounts.config({
  forbidClientAccountCreation: true
});

Meteor.publish('myBets', function() {
  return Bets.find({
    user: this.userId
  });
});

Meteor.publish('allMatches', function() {
  return Matches.find({});
});

Meteor.publish('userRankings', function() {
  var self = this;
  var pointsByUser = {};
  var initializing = true;
  var handle = Bets.find().observe({
    added: function(bet) {
      if (pointsByUser[bet.user] === undefined) {
        pointsByUser[bet.user] = 0;
        if (!initializing) {
          self.added('rankings', bet.user, {
            user: Meteor.users.findOne(bet.user).username,
            points: 0
          });
        }
      }

      if (_.isNumber(bet.points)) {
        pointsByUser[bet.user] = pointsByUser[bet.user] + bet.points;
      }
    },
    changed: function(newBet, oldBet) {
      var oldPoints = _.isNumber(oldBet.points) ? oldBet.points: 0;
      var newPoints = _.isNumber(newBet.points) ? newBet.points: 0;

      var points = (pointsByUser[newBet.user] - oldPoints) + newPoints;
      pointsByUser[newBet.user] = points;

      self.changed('rankings', newBet.user, {
        points: points
      });
    }
  });

  initializing = false;

  for (var uid in pointsByUser) {
    if (pointsByUser.hasOwnProperty(uid)) {
      self.added('rankings', uid, {
        user: Meteor.users.findOne(uid).username,
        points: pointsByUser[uid]
      });
    }
  }
  self.ready();

  self.onStop(function() {
    handle.stop();
  });
});

Bets.allow({
  remove: function(userId, bet) {
    return bet.user === userId;
  }
});

var isAdmin = function(userId) {
  var user = Meteor.users.findOne(userId);
  if (user && user.profile && user.profile.isAdmin) {
    return true;
  }
};

Matches.allow({
  update: function(userId) {
    return isAdmin(userId);
  }
});

Meteor.users.deny({
  update: function(userId, docs, fields) {
    return true; //TODO only isAdmin field in profile
  }
});

var timeIsUp = function(match_time) {
  var m = parseStartTime(match_time);
  m.subtract('minutes', 10);

  return !moment().isBefore(m);
};

var calculatePoints = function(result, bet) {
  if (result === bet) {
    return 3;
  }

  var result_split = result.split(':');
  var result_t1 = parseInt(result_split[0], 10);
  var result_t2 = parseInt(result_split[1], 10);

  var bet_result_split = bet.split(':');
  var bet_result_t1 = parseInt(bet_result_split[0], 10);
  var bet_result_t2 = parseInt(bet_result_split[1], 10);

  if (result_t1 > result_t2 && bet_result_t1 > bet_result_t2 ||
    result_t1 < result_t2 && bet_result_t1 < bet_result_t2 ||
    result_t1 === result_t2 && bet_result_t1 === bet_result_t2) {
    return 1;
  } else {
    return 0;
  }
};

var updateMatchTime = function(match) {
  Matches.update(match._id, {
    '$set': {
      timeIsUp: timeIsUp(match.start),
      remainingTime: parseStartTime(match.start).valueOf() - moment().valueOf()
    }
  });
};

Meteor.startup(function() {
  Meteor.setInterval(function() {
    var matches = Matches.find().fetch();

    _.each(matches, function(match) {
      updateMatchTime(match);
    });
  }, 120 * 1000); //update remaining time for all matches

  Matches.find().observe({
    changed: function(match) {
      var betsByMatch = Bets.find({
        match: match._id
      }).fetch();

      _.each(betsByMatch, function(bet) {
        var points;

        if (match.result && bet.result) {
          points = 0;
          points += calculatePoints(match.result, bet.result);
        }

        if (match.result_overtime && bet.result_overtime &&
          points !== undefined) {
          points += calculatePoints(match.result_overtime, bet.result_overtime);
        }

        if (match.result_eleven && bet.result_eleven &&
          points !== undefined) {
          points += calculatePoints(match.result_eleven, bet.result_eleven);
        }

        Bets.update(bet._id, {
          '$set': {
            points: points
          }
        });
      });
    }
  });

  Matches.find().observeChanges({
    changed: function(id, fields) {
      if (_.has(fields, 'start')) {
        updateMatchTime(Matches.findOne(id));
      }
    }
  });
});

Meteor.methods({
  applyBet: function(match, b1, b2, b1_overtime, b2_overtime, b1_eleven,
    b2_eleven) {

    b1 = parseInt(b1, 10);
    b2 = parseInt(b2, 10);
    b1_overtime = parseInt(b1_overtime, 10);
    b2_overtime = parseInt(b2_overtime, 10);
    b1_eleven = parseInt(b1_eleven, 10);
    b2_eleven = parseInt(b2_eleven, 10);

    var result;
    var result_overtime;
    var result_eleven;

    if (!isNaN(b1) && !isNaN(b2)) {
      result = b1 + ':' + b2;
    }

    var noResultOvertime = false;
    if (!isNaN(b1_overtime) && !isNaN(b2_overtime) && result && b1 === b2) {
      result_overtime = b1_overtime + ':' + b2_overtime;
    } else if (result && b1 === b2) {
      result_overtime = result;
      noResultOvertime = true;
    }

    if (!isNaN(b1_eleven) && !isNaN(b2_eleven) && result_overtime && (
      b1_overtime === b2_overtime || noResultOvertime)) {
      result_eleven = b1_eleven + ':' + b2_eleven;
    } else if (result_overtime && (
      b1_overtime === b2_overtime || noResultOvertime)) {
      result_eleven = result_overtime;
    }

    if (this.userId && result && !timeIsUp(match.start)) {
      Bets.upsert({
        match: match._id,
        user: this.userId
      }, {
        match: match._id,
        user: this.userId,
        result: result,
        result_overtime: result_overtime,
        result_eleven: result_eleven
      });
      return true;
    } else if (!this.userId) {
      throw new Meteor.Error(999, 'NO! Need user logged in!');
    } else if (!result) {
      throw new Meteor.Error(998, 'NO! Need valid result!');
    } else {
      updateMatchTime(match);
      throw new Meteor.Error(997, 'NO! Time is up!');
    }
  },
  createNewUser: function(user, pw, admin) {
    if (isAdmin(this.userId)) {
      Accounts.createUser({
        username: user,
        password: pw,
        profile: {
          isAdmin: admin
        }
      });
    } else {
      throw new Meteor.Error(996, 'NO! Only Admin!');
    }
  }
});


//SEED DATA

Meteor.startup(function() {

  if (Matches.find().count() === 0) {
    Accounts.createUser({
      username: 'ag',
      password: 'default',
      profile: {
        isAdmin: true
      }
    });

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
      team1: 'Mexiko',
      team2: 'Kamerun',
      result: null,
      isFixed: true
    });

    Matches.insert({
      type: 'Gruppe A',
      start: '17.06.2014	21:00',
      team1: 'Brasilien',
      team2: 'Mexiko',
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
      team1: 'Kroatien',
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
      result: null,
      isFixed: true
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
