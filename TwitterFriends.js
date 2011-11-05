var map = (function(){
    var latlng = new google.maps.LatLng(39, -94),
    options = {
        zoom: 4,
        center: latlng,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    return new google.maps.Map(document.getElementById("map_canvas"), options);
})();

var TwitterFriends = function(sn){    
    this.getTwitterFriendIds(sn);
    this.follows = [];
    this.markers = [];
    this.receivedCalls = 0;
    this.totalCalls = 0;
    this.map = map;
};

TwitterFriends.prototype.constructor = TwitterFriends;

TwitterFriends.prototype.getTwitterFriendIds = function(sn){
    $.ajax({url:'https://api.twitter.com/1/friends/ids.json?cursor=-1&screen_name='+sn+'&callback=twitterFriends.receiveFollowerIds', dataType:'jsonp'});
};

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
    this.totalCalls = callStrings.length;
    this.sendCallStrings(callStrings);
};

TwitterFriends.prototype.sendCallStrings = function(callStrings){
    for(var i = 0; i < callStrings.length; i++){
        $.ajax({url:callStrings[i], dataType:'jsonp'});    
    }
};


TwitterFriends.prototype.receiveCallStringResults = function(data){
    //receive results within an indeterminate amount of time
    this.receivedCalls++;
    //we have an array of objects we need data for
    for(var i = 0, l = data.length; i < l; i++){
        this.follows.push(data[i]);
    }
    
    if(this.receivedCalls == this.totalCalls){
        this.sendGeoCalls();
    }
};

TwitterFriends.prototype.sendGeoCalls = function(){
    for(var i = 0, l = this.follows.length; i < l; i++){
        this.callGeoCoder(this.follows[i].location, i);
    }
};

TwitterFriends.prototype.callGeoCoder = function(location, index){
    if(location){
        location = location.replace(/\s/g, '+');
        var url = 'http://where.yahooapis.com/geocode?location='+location+'&flags=J&appid=dj0yJmk9WGUydmhyQ0RtekIxJmQ9WVdrOWRVVlpaMmhvTkdjbWNHbzlNVFUyTnpNeU5ERTJNZy0tJnM9Y29uc3VtZXJzZWNyZXQmeD01ZA--&callback=receiveGeoCall';
        this.callGetJson(url, index);
    }
};

TwitterFriends.prototype.callGetJson = function(url, index){
    var that = this;
    $.getJSON(url, function(data){
        var i = index;
        var result;
        if(data.ResultSet.Found >= 1){
            result = data.ResultSet.Results[0];
        } else {
            return;    
        }
        var img = that.follows[i].profile_image_url;
        var LatLng = new google.maps.LatLng(result.latitude, result.longitude);
        var marker = new google.maps.Marker({
            icon: img,
            position: LatLng,
            map: that.map
        });
    });
};