$(document).ready(function(){
    twttr.anywhere(function (T) {
        var currentUser,
        screenName,
        profileImage,
        screenNameTemp,
        profileImageTag;
 
        if (T.isConnected()) {
          currentUser = T.currentUser;
          screenName = currentUser.data('screen_name');
          profileImage = currentUser.data('profile_image_url');
          profileImageTag = "<img src='" + profileImage + "'/>";
          screenNameTemp = '<a class="logged-sn">'+screenName+'</a><div class="followers"></div>';
          $(".twitter-login").append(profileImageTag + screenNameTemp);
          twitterFriends = new TwitterFriends(screenName);
        } else {
          T(".twitter-login").connectButton({
              authComplete: function(user) {
                  currentUser = user;
                  screenName = currentUser.data('screen_name');
                  profileImage = currentUser.data('profile_image_url');
                  profileImageTag = "<img src='" + profileImage + "'/>";
                  screenNameTemp = '<a class="logged-sn">'+screenName+'</a><div class="followers"></div>';
                  $(".twitter-login").append(profileImageTag + screenNameTemp);
                  $('.twitter-login iframe').remove();
                  twitterFriends = new TwitterFriends(screenName);
              } 
          });
        };
    });
    $('.sn-button').bind('click', function(){
        var sn = $('.sn-input').val();
        twitterFriends = new TwitterFriends(sn);
        $('.sn-button').fadeOut();
        $('.sn-input').fadeOut();
    });
});
