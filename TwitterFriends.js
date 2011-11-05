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
 * I hope to remove jQuery at least
 *
 */
var TwitterFriends = function(sn){    
    this.getTwitterFriendIds(sn);
    this.follows = [];
    this.markers = [];
    this.locations = [];
    this.receivedCalls = 0;
    this.totalCalls = 0;
    this.map = map;
};

TwitterFriends.prototype.constructor = TwitterFriends;

/*
 * Get your followers ids from the twitter API and send them
 * to the twitterFriends.receiveFollowerIds callback
 * depends on having a global instance of TwitterFriends named twitterFriends
 *
 */
TwitterFriends.prototype.getTwitterFriendIds = function(sn){
    $.ajax({url:'https://api.twitter.com/1/friends/ids.json?cursor=-1&screen_name='+sn+'&callback=twitterFriends.receiveFollowerIds', dataType:'jsonp'});
};

/*
 * Create an array of arrays, each holding 100 ids of followers
 * this breaks up the requests to we don't have one giant request
 * and send the requests to createUserCallString to be assembled
 *
 */
TwitterFriends.prototype.receiveFollowerIds = function(data){
    var chunkedFriends = [], tmpArr = [];
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
        this.callGetJson(url, index);
    }
};

/*
 * Finally make calls to the Yahoo! Places API
 * callback sends the Latatitude and Longitude to handleLocations
 * 
 */
TwitterFriends.prototype.callGetJson = function(url, index){
    var that = this;
    $.getJSON(url, function(data){
        var i = index;
        var result;
        //check if there are results, otherwise we get errors
        if(data.ResultSet.Found >= 1){
            result = data.ResultSet.Results[0];
        } else {
            return;    
        }
        
        var person = that.follows[i];
        var LatLng = new google.maps.LatLng(result.latitude, result.longitude);
        //handle the location information for each person
        that.handleLocations(LatLng, person);
    });
};

/*
 * Find all unique locations and if more than one user
 * belongs to a location attach the user to that location
 *
 */
TwitterFriends.prototype.handleLocations = function(LatLng, person){
    var uniqueLocation = true,
        markup, 
        marker;
    
    //check if the location isEqual to any of the same in this.locations
    for(var i = 0, l = this.locations.length; i < l; i++){
        //if yes break the loop
        if(_.isEqual(LatLng, this.locations[i])){
            uniqueLocation = false;
            break;    
        }
    }
    if(!uniqueLocation){
       return;     
    }
    
    if(uniqueLocation && this.locations.length){
        this.locations.push(LatLng);
        markup = '<div class="marker"></div>';    
        marker = new RichMarker({
            position: LatLng,
            map: map,
            content: markup
        });
    } else if (!this.locations.length){
        this.locations.push(LatLng);
        markup = '<div class="marker"></div>';    
        marker = new RichMarker({
            position: LatLng,
            map: map,
            content: markup
        });
    }
    //<img src="'+img+'"/>
};

TwitterFriends.prototype.groupByLocation = function(){
    
};

