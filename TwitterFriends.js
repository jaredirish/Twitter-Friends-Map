/*
 * Create the initial map on map load from Google Map
 * Depends on Google Maps, an Element with id="map_canvas"
 *
 */
var map = (function(){
    var latlng = new google.maps.LatLng(39, -94),
    options = {
        zoom: 4,
        center: latlng,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    return new google.maps.Map(document.getElementById("map_canvas"), options);
})();

/*
 * Base Constructor for the TwitterFriends Object
 * Currently depends on jQuery and Underscore for initial convenience
 * Depends on jQuery for AJAX compatibility, and Underscore for _.isEqual
 *
 */
var TwitterFriends = function(sn){
    this.screenName = sn;
    this.follows = [];
    this.locations = [];
    this.calledLocations = 0;
    this.markers = [];
    this.receivedLocations = 0;
    this.receivedCalls = 0;
    this.totalCalls = 0;
    this.map = map;
    this.callTimeout = 0;
    this.getTwitterFriendIds(sn);
};

TwitterFriends.prototype.constructor = TwitterFriends;

/*
 * Get your followers ids from the twitter API and send them
 * to the twitterFriends.receiveFollowerIds callback
 * depends on having a global instance of TwitterFriends named twitterFriends
 *
 */
TwitterFriends.prototype.getTwitterFriendIds = function(sn){
    var url = 'https://api.twitter.com/1/friends/ids.json?cursor=-1&screen_name='+sn+'&callback=twitterFriends.receiveFollowerIds';
    $.ajax({
        url:url, 
        dataType:'jsonp',
        error: function(jqXHR, textStatus, errorThrown){
            if(textStatus == 'timeout'){
                $('.twitter-alert').show();
            }
        },
        timeout:3000
    });
};

/*
 * Create an array of arrays, each holding 100 ids of followers
 * this breaks up the requests to we don't have one giant request
 * and send the requests to createUserCallString to be assembled
 *
 */
TwitterFriends.prototype.receiveFollowerIds = function(data){
    var chunkedFriends = [], tmpArr = [];
    this.setFollowersMessage(data.ids.length);
    for(var i = 0, l = data.ids.length; i < l; i++){
        tmpArr.push(data.ids[i]);
        if(tmpArr.length === 100){
            chunkedFriends.push(tmpArr);
            tmpArr = [];
        }
    }
    chunkedFriends.push(tmpArr);
    this.createUserCallString(chunkedFriends);
};


/*
 * Set followers message to update the user on approximate time left
 *
 */
TwitterFriends.prototype.setFollowersMessage = function(f){
    var n = f ? f : this.follows.length;
    $('.followers').show().html('following '+n+' people.');    
};

/*
 * Assemble strings to make AJAX calls against the Twitter API
 * returns Twitter User data to the receiveCallStringResults callback
 * 
 */
TwitterFriends.prototype.createUserCallString = function(users){
    //create an array of strings to make separate calls the the twitter JSON API
    var callStrings = [],
    str = 'https://api.twitter.com/1/users/lookup.json?user_id=',
    tmpStr = str;
    for(var i = 0, l = users.length; i < l; i++){
        for(var j = 0, k = users[i].length; j < k; j++){
            tmpStr += users[i][j] + ',';
        }
        tmpStr = tmpStr.substring(0, tmpStr.length - 1);
        tmpStr += '&callback=twitterFriends.receiveCallStringResults';
        callStrings.push(tmpStr);
        tmpStr = str;
    }
    //save the total number of call we make the the Twitter API for later use
    this.totalCalls = callStrings.length;
    this.sendCallStrings(callStrings);
};

/*
 * Make the AJAX calls
 * returns Twitter User data to the receiveCallStringResults callback
 * 
 */
TwitterFriends.prototype.sendCallStrings = function(callStrings){
    for(var i = 0; i < callStrings.length; i++){
        $.ajax({url:callStrings[i], dataType:'jsonp'});    
    }
};

/*
 * Push all of the User data returned from Twitter into the follows array
 * 
 */
TwitterFriends.prototype.receiveCallStringResults = function(data){
    //increment for the number of results we have received
    this.receivedCalls++;
    //push the user data into the follows array
    for(var i = 0, l = data.length; i < l; i++){
        this.follows.push(data[i]);
    }
    //when we know we have all the data get Geo data for each follower
    if(this.receivedCalls == this.totalCalls){
        this.sendGeoCalls();
    }
};

/*
 * Utility function for calling the geoCoder and saving the index
 * this should be refactored or renamed at the least
 * 
 */
TwitterFriends.prototype.sendGeoCalls = function(){
    for(var i = 0, l = this.follows.length; i < l; i++){
        this.callGeoCoder(this.follows[i].location, i);
    }
};

/*
 * Create the call AJAX call strings for the Yahoo! Places API
 * 
 */
TwitterFriends.prototype.callGeoCoder = function(location, index){
    if(location){
        //remove whitespace and replace with plusses
        location = location.replace(/\s/g, '+');
        var url = 'http://where.yahooapis.com/geocode?location='+location+'&flags=J&appid=dj0yJmk9WGUydmhyQ0RtekIxJmQ9WVdrOWRVVlpaMmhvTkdjbWNHbzlNVFUyTnpNeU5ERTJNZy0tJnM9Y29uc3VtZXJzZWNyZXQmeD01ZA--&callback=receiveGeoCall';
        this.callGetJson(url, location, index);
    }
};

/*
 * Finally make calls to the Yahoo! Places API
 * callback sends the Latatitude and Longitude to handleLocations
 * 
 */
TwitterFriends.prototype.callGetJson = function(url, location, index){
    this.calledLocations++;
    var that = this;
    $.ajax({
        url: url,
        error: function(jqXHR, textStatus, errorThrown) {
            console.log("error " + textStatus + " errorThrown" + errorThrown);
            console.log("incoming Text " + jqXHR.responseText);
        },
        success: function(response){
            var i = index, result;
            response = (typeof response == 'string') ? JSON.parse(response) : response;
            that.receivedLocations++;
            
            if(!response.ResultSet){
                response = that.xmlToJson(response);
            }
            if(response.ResultSet.Found >= 1){
                result = response.ResultSet.Results[0];
            } else {
                return;    
            }
            
            var person = that.follows[i];
            var LatLng = new google.maps.LatLng(result.latitude, result.longitude);
            //handle the location information for each person
            that.handleMarkerGroups(LatLng, person);
        }
    });
};

/*
 * Implemented this xmlToJson function, just copy-pasted
 * from David Walsh's blog, this is used to fix Yahoo! sending
 * XML even when I request JSON
 *
 */
TwitterFriends.prototype.xmlToJson = function(xml){
  // Create the return object
  var obj = {};

  if (xml.nodeType == 1) { // element
    // do attributes
    if (xml.attributes.length > 0) {
    obj["@attributes"] = {};
      for (var j = 0; j < xml.attributes.length; j++) {
        var attribute = xml.attributes.item(j);
        obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
      }
    }
  } else if (xml.nodeType == 3) { // text
    obj = xml.nodeValue;
  }

  // do children
  if (xml.hasChildNodes()) {
    for(var i = 0; i < xml.childNodes.length; i++) {
      var item = xml.childNodes.item(i);
      var nodeName = item.nodeName;
      if (typeof(obj[nodeName]) == "undefined") {
        obj[nodeName] = this.xmlToJson(item);
      } else {
        if (typeof(obj[nodeName].length) == "undefined") {
          var old = obj[nodeName];
          obj[nodeName] = [];
          obj[nodeName].push(old);
        }
        obj[nodeName].push(this.xmlToJson(item));
      }
    }
  }
  return obj;
};

TwitterFriends.prototype.handleMarkerGroups = function(LatLng, person){
    //each person has a unique location until we check that they don't
    var uniqueLocation = true;
    
    for(var i = 0, l = this.locations.length; i < l; i++){
        //check if the location coming back is equal to any of the locations we have
        if(_.isEqual(LatLng, this.locations[i].latLng)){
            //if the location is equal push the person into the existing object
            this.locations[i].followers.push(person);
            //recalculate necessary markup and refresh the marker
            this.resetMarkupAndRefresh(this.locations[i]);
            return;
        }
    }
    
    //create single person markup
    var markup = '<div class="single-marker">';
    markup += '<div class="img-container"><img src="'+person.profile_image_url+'" alt="'+person.screen_name+'" /></div>';
    markup += '</div>';
    
    var marker = new RichMarker({
            position: LatLng,
            map: map,
            shadow: '',
            content: markup
    });
    
    this.markers.push(marker);
    
    var locationObject = {
        latLng : LatLng,
        followers : [person],
        marker : marker
    };
    this.locations.push(locationObject);
};

/*
 * Much cleaner way to dynamically add users to the map
 *
 */
TwitterFriends.prototype.resetMarkupAndRefresh = function(locationObj){
    var marker = locationObj.marker,
        fol = locationObj.followers.length,
        width = fol.toString().length * 7,
        tierCutOff = 15,
        top, left, person, j,
        markup = '<div class="group-marker">'+ '<div class="group-amount" style="margin-left:-'+width+'px;">'+fol+'</div><div class="group-img-wrap">';
        if(fol < tierCutOff){ 
            points = this.circlePoints(80, fol, 8, 8);
        } else {
            points = this.circlePoints(80, 15, 8, 8);
        }
    for(var i = 0, l = locationObj.followers.length; i < l; i++){
        if(i >= 15){
             points = this.circlePoints(125, fol, 8, 8);
        }
        person = locationObj.followers[i];
        top = points[i][0];
        left = points[i][1];
        markup += '<div style="position:absolute;top:'+top+'px;left:'+left+'px;" class="img-container"><img src="'+person.profile_image_url+'" alt="'+person.screen_name+'" /></div>';
    }
    markup += '</div></div>';
    marker.content = markup;
    marker.setMap(map);
    //pyramid of DOOOOM
    if(!this.followsLeft()){
        twttr.anywhere(function (T) {
            T('.img-container').hovercards({
                username: function(node) {
                    return node.alt;
                }
            });
        });    
    }
};

TwitterFriends.prototype.followsLeft = function(){
    var followsLeft = (this.calledLocations - this.receivedLocations);
    return followsLeft;
};

/*
 * Utility function for returning circular points about a center
 *
 */
TwitterFriends.prototype.circlePoints = function(radius, steps, centerX, centerY){
    var xValues = [], yValues = [], points = [], tmpX, tmpY;
    for (var i = 0; i < steps; i++) {
        
        xValues[i] = (centerX + radius * Math.cos(2 * Math.PI * i / steps));
        
        tmpX = Math.floor(xValues[i]);
        
        yValues[i] = (centerY + radius * Math.sin(2 * Math.PI * i / steps));
        
        tmpY = Math.floor(yValues[i]);
        
        points.push([tmpX, tmpY]);
    }
    return points;
};


TwitterFriends.prototype.cleanup = function(){
    this.setFollowersMessage();
    this.followsLeft();
};

