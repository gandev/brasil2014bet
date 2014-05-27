Matches = new Meteor.Collection('matches');
Bets = new Meteor.Collection('bets');

if (Meteor.isClient) {
  UI.body.helpers({
    matchTypes: function () {
      var matches = Matches.find().fetch();
      var matchTypes = [];
      _.each(matches, function (match) {
        matchTypes.push(match.type);
      });
      return _.uniq(matchTypes);
    },
    matchesByType: function () {
      return Matches.find({type: this.toString()});
    }
  });

  Template.myBet.helpers({
    currentBet: function () {
      var bet = Bets.findOne({match: this._id});
      return bet;
    }
  });

  Template.myBet.events({
    'click .apply-bet': function (evt, tmpl) {
      var b1 = tmpl.$('.bet-team1').val();
      var b2 = tmpl.$('.bet-team2').val();
      Bets.insert({match: this._id, team1: b1, team2: b2});
    },
    'click .remove-bet': function (evt, tmpl) {
      Bets.remove(this._id);
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {

    if(Matches.find().count() === 0) {

      //GRUPPE A
      Matches.insert({
        type: 'Gruppe A',
        start: '12.06.2014	22:00',
        team1: 'Brasilien',
        team2: 'Kroatien',
        result: null
      });

      Matches.insert({
        type: 'Gruppe A',
        start: '13.06.2014	18:00',
        team1: 'Mexico',
        team2: 'Kamerun',
        result: null
      });

      Matches.insert({
        type: 'Gruppe A',
        start: '17.06.2014	21:00',
        team1: 'Brasilien',
        team2: 'Mexico',
        result: null
      });

      Matches.insert({
        type: 'Gruppe A',
        start: '19.06.2014	00:00',
        team1: 'Kamerun',
        team2: 'Kroatien',
        result: null
      });

      Matches.insert({
        type: 'Gruppe A',
        start: '23.06.2014	22:00',
        team1: 'Kamerun',
        team2: 'Brasilien',
        result: null
      });

      Matches.insert({
        type: 'Gruppe A',
        start: '23.06.2014	22:00',
        team1: 'Kroation',
        team2: 'Mexiko',
        result: null
      });

      //GRUPPE B
      Matches.insert({
        type: 'Gruppe B',
        start: '13.06.2014	21:00',
        team1: 'Spanien',
        team2: 'Niederlande',
        result: null
      });

      Matches.insert({
        type: 'Gruppe B',
        start: '14.06.2014	00:00',
        team1: 'Chile',
        team2: 'Australien',
        result: null
      });

      Matches.insert({
        type: 'Gruppe B',
        start: '18.06.2014	18:00',
        team1: 'Australien',
        team2: 'Niederlande',
        result: null
      });

      Matches.insert({
        type: 'Gruppe B',
        start: '18.06.2014	21:00',
        team1: 'Spanien',
        team2: 'Chile',
        result: null
      });

      Matches.insert({
        type: 'Gruppe B',
        start: '23.06.2014	18:00',
        team1: 'Australien',
        team2: 'Spanien',
        result: null
      });

      Matches.insert({
        type: 'Gruppe B',
        start: '23.06.2014	18:00',
        team1: 'Niederlande',
        team2: 'Chile',
        result: null
      });

      //GRUPPE C
      Matches.insert({
        type: 'Gruppe C',
        start: '14.06.2014	18:00',
        team1: 'Kolumbien',
        team2: 'Griechenland',
        result: null
      });

      Matches.insert({
        type: 'Gruppe C',
        start: '15.06.2014	03:00',
        team1: 'Elfenbeinküste',
        team2: 'Japan',
        result: null
      });

      Matches.insert({
        type: 'Gruppe C',
        start: '19.06.2014	18:00',
        team1: 'Kolumbien',
        team2: 'Elfenbeinküste',
        result: null
      });

      Matches.insert({
        type: 'Gruppe C',
        start: '20.06.2014	00:00',
        team1: 'Japan',
        team2: 'Griechenland',
        result: null
      });

      Matches.insert({
        type: 'Gruppe C',
        start: '24.06.2014	22:00',
        team1: 'Japan',
        team2: 'Kolumbien',
        result: null
      });

      Matches.insert({
        type: 'Gruppe C',
        start: '24.06.2014	22:00',
        team1: 'Griechenland',
        team2: 'Elfenbeinküste',
        result: null
      });

      //GRUPPE D
      Matches.insert({
        type: 'Gruppe D',
        start: '14.06.2014	21:00',
        team1: 'Uruguay',
        team2: 'Costa Rica',
        result: null
      });

      Matches.insert({
        type: 'Gruppe D',
        start: '15.06.2014	00:00',
        team1: 'England',
        team2: 'Italien',
        result: null
      });

      Matches.insert({
        type: 'Gruppe D',
        start: '19.06.2014	21:00',
        team1: 'Uruguay',
        team2: 'England',
        result: null
      });

      Matches.insert({
        type: 'Gruppe D',
        start: '20.06.2014	18:00',
        team1: 'Italien',
        team2: 'Costa Rica',
        result: null
      });

      Matches.insert({
        type: 'Gruppe D',
        start: '24.06.2014	18:00',
        team1: 'Costa Rica',
        team2: 'England',
        result: null
      });

      Matches.insert({
        type: 'Gruppe D',
        start: '24.06.2014	18:00',
        team1: 'Italien',
        team2: 'Uruguay',
        result: null
      });

      //GRUPPE E
      Matches.insert({
        type: 'Gruppe E',
        start: '15.06.2014	18:00',
        team1: 'Schweiz',
        team2: 'Ecuador',
        result: null
      });

      Matches.insert({
        type: 'Gruppe E',
        start: '15.06.2014	21:00',
        team1: 'Frankreich',
        team2: 'Honduras',
        result: null
      });

      Matches.insert({
        type: 'Gruppe E',
        start: '20.06.2014	21:00',
        team1: 'Schweiz',
        team2: 'Frankreich',
        result: null
      });

      Matches.insert({
        type: 'Gruppe E',
        start: '21.06.2014	00:00',
        team1: 'Honduras',
        team2: 'Ecuador',
        result: null
      });

      Matches.insert({
        type: 'Gruppe E',
        start: '25.06.2014	22:00',
        team1: 'Honduras',
        team2: 'Schweiz',
        result: null
      });

      Matches.insert({
        type: 'Gruppe E',
        start: '25.06.2014	22:00',
        team1: 'Ecuador',
        team2: 'Frankreich',
        result: null
      });

      //GRUPPE F
      Matches.insert({
        type: 'Gruppe F',
        start: '16.06.2014	00:00',
        team1: 'Argentinien',
        team2: 'Bosnien-Herzegowina',
        result: null
      });

      Matches.insert({
        type: 'Gruppe F',
        start: '16.06.2014	21:00',
        team1: 'Iran',
        team2: 'Nigeria',
        result: null
      });

      Matches.insert({
        type: 'Gruppe F',
        start: '21.06.2014	18:00',
        team1: 'Argentinien',
        team2: 'Iran',
        result: null
      });

      Matches.insert({
        type: 'Gruppe F',
        start: '22.06.2014	00:00',
        team1: 'Nigeria',
        team2: 'Bosnien-Herzegowina',
        result: null
      });

      Matches.insert({
        type: 'Gruppe F',
        start: '25.06.2014	18:00',
        team1: 'Nigeria',
        team2: 'Argentinien',
        result: null
      });

      Matches.insert({
        type: 'Gruppe F',
        start: '25.06.2014	18:00',
        team1: 'Bosnien-Herzegowina',
        team2: 'Iran',
        result: null
      });

      //GRUPPE G
      Matches.insert({
        type: 'Gruppe G',
        start: '16.06.2014	18:00',
        team1: 'Deutschland',
        team2: 'Portugal',
        result: null
      });

      Matches.insert({
        type: 'Gruppe G',
        start: '17.06.2014	00:00',
        team1: 'Ghana',
        team2: 'USA',
        result: null
      });

      Matches.insert({
        type: 'Gruppe G',
        start: '21.06.2014	21:00',
        team1: 'Deutschland',
        team2: 'Ghana',
        result: null
      });

      Matches.insert({
        type: 'Gruppe G',
        start: '23.06.2014	00:00',
        team1: 'USA',
        team2: 'Portugal',
        result: null
      });

      Matches.insert({
        type: 'Gruppe G',
        start: '26.06.2014	18:00',
        team1: 'Portugal',
        team2: 'Ghana',
        result: null
      });

      Matches.insert({
        type: 'Gruppe G',
        start: '26.06.2014	18:00',
        team1: 'USA',
        team2: 'Deutschland',
        result: null
      });

      //GRUPPE H
      Matches.insert({
        type: 'Gruppe H',
        start: '17.06.2014	18:00',
        team1: 'Belgien',
        team2: 'Algerien',
        result: null
      });

      Matches.insert({
        type: 'Gruppe H',
        start: '18.06.2014	00:00',
        team1: 'Russland',
        team2: 'Südkorea',
        result: null
      });

      Matches.insert({
        type: 'Gruppe H',
        start: '22.06.2014	18:00',
        team1: 'Belgien',
        team2: 'Russland',
        result: null
      });

      Matches.insert({
        type: 'Gruppe H',
        start: '22.06.2014	21:00',
        team1: 'Südkorea',
        team2: 'Algerien',
        result: null
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
        result: null
      });

      //Achtelfinale
      Matches.insert({
        type: 'Achtelfinale',
        start: '28.06.2014	18:00',
        team1: 'Sieger Gruppe A',
        team2: 'Zweiter Gruppe B',
        result: null
      });

      Matches.insert({
        type: 'Achtelfinale',
        start: '28.06.2014	22:00',
        team1: 'Sieger Gruppe C',
        team2: 'Zweiter Gruppe D',
        result: null
      });

      Matches.insert({
        type: 'Achtelfinale',
        start: '29.06.2014	18:00',
        team1: 'Sieger Gruppe B',
        team2: 'Zweiter Gruppe A',
        result: null
      });

      Matches.insert({
        type: 'Achtelfinale',
        start: '29.06.2014	22:00',
        team1: 'Sieger Gruppe D',
        team2: 'Zweiter Gruppe C',
        result: null
      });

      Matches.insert({
        type: 'Achtelfinale',
        start: '30.06.2014	18:00',
        team1: 'Sieger Gruppe E',
        team2: 'Zweiter Gruppe F',
        result: null
      });

      Matches.insert({
        type: 'Achtelfinale',
        start: '30.06.2014	22:00',
        team1: 'Sieger Gruppe G',
        team2: 'Zweiter Gruppe H',
        result: null
      });

      Matches.insert({
        type: 'Achtelfinale',
        start: '01.07.2014	18:00',
        team1: 'Sieger Gruppe F',
        team2: 'Zweiter Gruppe E',
        result: null
      });

      Matches.insert({
        type: 'Achtelfinale',
        start: '01.07.2014	22:00',
        team1: 'Sieger Gruppe H',
        team2: 'Zweiter Gruppe G',
        result: null
      });

      //Viertelfinale
      Matches.insert({
        type: 'Viertelfinale',
        start: '04.07.2014	18:00',
        team1: 'Sieger AF 5',
        team2: 'Sieger AF 6',
        result: null
      });

      Matches.insert({
        type: 'Viertelfinale',
        start: '04.07.2014	22:00',
        team1: 'Sieger AF 1',
        team2: 'Sieger AF 2',
        result: null
      });

      Matches.insert({
        type: 'Viertelfinale',
        start: '05.07.2014	18:00',
        team1: 'Sieger AF 7',
        team2: 'Sieger AF 8',
        result: null
      });

      Matches.insert({
        type: 'Viertelfinale',
        start: '05.07.2014	22:00',
        team1: 'Sieger AF 3',
        team2: 'Sieger AF 4',
        result: null
      });

      //Halbfinale
      Matches.insert({
        type: 'Halbfinale',
        start: '08.07.2014	22:00',
        team1: 'Sieger VF 1',
        team2: 'Sieger VF 2',
        result: null
      });

      Matches.insert({
        type: 'Halbfinale',
        start: '09.07.2014	22:00',
        team1: 'Sieger VF 4',
        team2: 'Sieger VF 3',
        result: null
      });

      Matches.insert({
        type: 'Spiel um Platz 3',
        start: '12.07.2014	22:00',
        team1: 'Verlierer HF 1',
        team2: 'Verlierer HF 2',
        result: null
      });

      Matches.insert({
        type: 'Finale',
        start: '13.07.2014	21:00',
        team1: 'Sieger HF 1',
        team2: 'Sieger HF 2',
        result: null
      });
    }
  });
}
