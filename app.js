$(document).ready(function(){
    $('.sn-button').bind('click', function(){
        var sn = $('.sn-input').val();
        twitterFriends = new TwitterFriends(sn);
        $('.sn-button').fadeOut();
        $('.sn-input').fadeOut();
    });
});
