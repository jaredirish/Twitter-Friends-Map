$(document).ready(function(){
    $('.sn-button').bind('click', function(){
        var sn = $('.sn-input').val();
        if(localStorage.getItem('sn') == sn){
            twitterFriends = new TwitterFriends(sn, true);
        } else {
            localStorage.setItem('sn', sn);
            twitterFriends = new TwitterFriends(sn);    
        }
        $('.sn-button').fadeOut();
        $('.sn-input').fadeOut();
    });
});
