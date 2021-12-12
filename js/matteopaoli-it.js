// Copyright 2016 - Matteo Paoli, mttpla@gmail.com

$(document).ready(function () {

    var meImageArray = new Array();
    meImageArray.push("./imgs/me/matteopaoli2018.jpg");
    meImageArray.push("./imgs/me/matteopaoli2016.jpg");
    meImageArray.push("./imgs/me/matteopaoli2015.jpg");
    meImageArray.push("./imgs/me/matteopaoli2011.png");
    meImageArray.push("./imgs/me/matteopaoli2011-cv.png");
    meImageArray.push("./imgs/me/matteopaoli2009.png");
    meImageArray.push("./imgs/me/matteopaoli2019.png");

    var meImageArrayLength = meImageArray.length;


    $.getJSON("https://api.github.com/repos/mttpla/matteopaoli-it/commits", function(data) {
	$('.lastcommit').text(data[0].sha.substr(0, 8));
	$('.lastdate').text(data[0].commit.committer.date.replace("T", " ").replace("Z", " "));
	document.getElementById("lasthtmlurl").setAttribute("href",data[0].html_url);

    });

    var $element=$('.each-event, .title');
var $window = $(window);
$window.on('scroll resize', check_for_fade);
$window.trigger('scroll');
function check_for_fade() { 
    var window_height = $window.height();
    
    $.each($element, function (event) {
        var $element = $(this);
        var element_height = $element.outerHeight();
        var element_offset = $element.offset().top;
        space = window_height - (element_height + element_offset -$(window).scrollTop());
        if (space < 60) {
            $element.addClass("non-focus");
        } else {
            $element.removeClass("non-focus");
        }
 
    });
};

    function changeMeImage() {
	var i = Math.floor((Math.random() * meImageArrayLength) );
	document.getElementById("myPic").src = meImageArray[i];
    }

    setInterval(changeMeImage, 3000);

});
