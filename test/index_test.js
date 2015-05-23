'use strict';
var expect = require('chai').expect;
var chai = require('chai');

var chaiHttp = require('chai-http');
chai.use(chaiHttp);

var hostname = 'http://localhost:3000';

var agent = chai.request.agent(hostname);

describe('api', function() {

  it('should POST to /login with status code 200', function(done) {
    agent
    .post('/login')
    .set('x-chai-test', 'jon@example.com')
    .end(function(err, res) {
      expect(res).to.have.status(200);
      done();
    });
  });

  it('should GET to / with status code 200', function(done) {
    agent
    .get('/')
    .end(function(err, res) {
      expect(res).to.have.status(200);
      done();
    });
  });

  it('should POST /groups and receive 201 OK message', function(done) {
    agent
    .post('/groups')
    .set('Content-Type', 'application/json')
    .set('x-groups-post', 'createGroup')
    .send({'groupName': 'jons group'})
    .end(function(err, res) {
      expect(res).to.have.status(201);
      done();
    });
  });

  it('should POST /groups and add a user to the group', function(done) {
    agent
    .post('/groups')
    .set('Content-Type', 'application/json')
    .send({'groupId': '000000000000000000000004',
      'emails': ['three@example.com']})
    .end(function(err, res) {
      expect(res).to.have.status(201);
      done();
    });
  });

  it('should add an admin to a group', function(done) {
    agent
    .post('/groups/admin')
    .set('x-groups-admin-post', 'addAdmin')
    .set('Content-Type', 'application/json')
    .send({'adminEmail': 'jon@example.com',
      'groupId': '000000000000000000000004'})
    .end(function(err, res) {
      expect(res).to.have.status(201);
      done();
    });
  });
  it('logout of the jon user', function(done) {
    agent
    .get('/logout')
    .end(function(err, res) {
      expect(res).to.have.status(200);
      done();
    });
  });
  it('return status at checkin', function(done) {
    agent
    .get('/checkin')
    .end(function(err, res) {
      expect(res).to.have.status(200);
      done();
    });
  });
  it('should POST /login w/ nicks account get status 200', function(done) {
    agent
    .post('/login')
    .set('x-chai-test', 'nick@example.com')
    .end(function(err, res) {
      expect(res).to.have.status(200);
      done();
    });
  });
  it('should POST /groups and receive 201 OK message', function(done) {
    agent
    .post('/groups')
    .set('Content-Type', 'application/json')
    .set('x-groups-post', 'createGroup')
    .send({'groupName': 'nicks group'})
    .end(function(err, res) {
      expect(res).to.have.status(201);
      done();
    });
  });
  it('should POST /groups and receive 201 OK message', function(done) {
    agent
    .post('/groups')
    .set('Content-Type', 'application/json')
    .send({'groupId': '000000000000000000000004',
      'emails': ['jon@example.com']})
    .end(function(err, res) {
      expect(res).to.have.status(201);
      done();
    });
  });

  it('logout of the nick user', function(done) {
    agent
    .get('/logout')
    .end(function(err, res) {
      expect(res).to.have.status(200);
      done();
    });
  });

  it('should POST to /login with status code 200', function(done) {
    agent
    .post('/login')
    .set('x-chai-test', 'jvald8@gmail.com')
    .end(function(err, res) {
      expect(res).to.have.status(200);
      done();
    });
  });

  it('should redirect checkin to checkin button html page', function(done) {
    agent
    .get('/checkin')
    .end(function(err, res) {
      expect(res).status(200);
      expect(res.redirects[1]).to.be.eql
      (hostname + '/checkin/checkinbutton.html');
      done();
    });
  });

  it('should logout and redirect to login', function(done) {
    agent
    .get('/logout')
    .end(function(err, res) {
      expect(res).status(200);
      expect(res.redirects[0]).to.be.eql
      (hostname + '/login');
      done();
    });
  });

  it('should login and return 200 status', function(done) {
    agent
    .get('/login')
    .set('x-chai-test', 'jon@example.com')
    .end(function(err, res) {
      expect(res).status(200);
      done();
    });
  });

  it('should check current user and equal to jon@example.com', function(done) {
    agent
    .get('/login')
    .end(function(err, res) {
      expect(res).to.have.status(200);
      done();
    });
  });

});
