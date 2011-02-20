var xml2js = require('xml2js');
var http = require('http');
var fs = require('fs');
var strftime = require('strftime').strftime;

var xml = http.createClient(80, 'services.tvrage.com');
var host = { 'host': 'services.tvrage.com' };

/**
 * Fetches all episodes by series id
 */
function fetch (id, next) {
  var request = xml.request('GET', '/feeds/episode_list.php?sid=' + id, host);
  request.end();
  request.on('response', function (response) {
    response.setEncoding('utf8');
    var data;
    response.on('data', function (chunk) {
      data += chunk;
    });
    response.on('end', function () {
      next(data);
    });
  });
}

/**
 * Parses xml to javascript objects
 */
function parse (data, next) {
  var x2js = new xml2js.Parser();
  x2js.addListener('end', function (o) {
    next(o);
  });
  x2js.parseString(data);
}

/**
 * Fetches next episode, or throws
 */
function nextEpisode (o, next) {
  var nextEp;
  var previousEp;
  var currentEp;
  var today = new Date();
  var dates = [];
  $break = {};
  try {
    o.Episodelist.Season.forEach(function (s) {
      s.episode.forEach(function (ep) {
	dates.push(Date.parse(ep.airdate));
	previousEp = dates[dates.length - 2];
	currentEp = dates[dates.length - 1];
	if (previousEp && currentEp && today <= currentEp && today > previousEp) {
	  nextEp = ep;
	  nextEp.show = o.name;
	  throw $break;
	}
      });
    });
    throw $break;
  } catch (ignore) {
    if (nextEp) {
      next(null, nextEp)
    }
    else {
      next(new Error('no next episode'));
    }
  }
}

/**
 * Logs episode with air date
 */
var format = '%d/%m-%Y';
function log (today, episode) {
  var airdate = strftime(format, new Date(episode.airdate));
  console.log('%s - %s - %s'
      , episode.show
      , airdate === today ? 'TODAY' : airdate
      , episode.title
      );
}

/** 
 * Episode ids,
 * found at e.g. http://services.tvrage.com/feeds/full_search.php?show=lie to me
 */
var bones   = 2870
  , himym   = 3918
  , bigbang = 8511
  , greys   = 3741
  , lietome = 19295
  ; 

var episodeIds = [ bones, himym, bigbang, greys, lietome ]
  , upcoming = []
  , errors = 0
  , today = strftime(format, new Date())
  ;

episodeIds.forEach(function (id) {

  fetch(id, function (xml) {

    parse(xml, function (jsObjects) {

      nextEpisode(jsObjects, function (err, ep) {
	if (err) {
	  errors += 1;
	}
	else {
	  upcoming.push(ep);
	}
  
	var completed = upcoming.length + errors;
	if ( completed === episodeIds.length) {
	  upcoming.forEach(function (episode) {
	    log(today, episode);
	  });
	}
      });
    });
  }); 
});

