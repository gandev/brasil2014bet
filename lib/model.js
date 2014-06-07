/*

 TEST QUERIES:

 Accounts.createUser({username: 'test', password: 'test123'});
 Meteor.loginWithPassword('test', 'test123');

 Matches.update(Matches.findOne({type: 'Gruppe A'})._id, {'$set': {result: "1:2"}})
 Matches.update(Matches.findOne({type: 'Gruppe A'})._id, {'$set': {start: "15.05.2014	18:00"}})

*/

var infoBaseURL = 'http://www.conti-online.com/generator/www/de/de/contisoccerworld/themes/01_background/30_fifa_2014/15_team_portraits/';

Matches = new Meteor.Collection('matches', {
  transform: function (match) {
    match.infoURL = infoBaseURL + 'group_a_01.html';
    return match;
  }
});
Bets = new Meteor.Collection('bets');
Rankings = new Meteor.Collection('rankings');
