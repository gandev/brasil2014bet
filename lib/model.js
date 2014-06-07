/*

 TEST QUERIES:

 Accounts.createUser({username: 'test', password: 'test123'});
 Meteor.loginWithPassword('test', 'test123');

 Matches.update(Matches.findOne({type: 'Gruppe A'})._id, {'$set': {result: "1:2"}})
 Matches.update(Matches.findOne({type: 'Gruppe A'})._id, {'$set': {start: "15.05.2014	18:00"}})

*/

Matches = new Meteor.Collection('matches');
Bets = new Meteor.Collection('bets');
Rankings = new Meteor.Collection('rankings');
