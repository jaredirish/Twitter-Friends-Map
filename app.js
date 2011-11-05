$(document).ready(function(){
    $('.sn-button').bind('click', function(){
       twitterFriends = new TwitterFriends($('.sn-input').val());
       $('.sn-button').fadeOut();
       $('.sn-input').fadeOut();
    });
});
