// Copyright 2016 - Matteo Paoli, mttpla@gmail.com

$(document).ready(function () {
  

var meImageArray = new Array();
meImageArray.push("./imgs/me/matteopaoli2016.jpg");
meImageArray.push("./imgs/me/matteopaoli2015.jpg");
meImageArray.push("./imgs/me/matteopaoli2013.jpg");
meImageArray.push("./imgs/me/matteopaoli2011.jpg");

var meImageArrayLength = meImageArray.length;

var backgroundImageArray = new Array();
backgroundImageArray.push("url(../imgs/backgrounds/desktop_hibernate_1920x1200.jpg)");
backgroundImageArray.push("url(../imgs/backgrounds/desktop_jsfunit_1920x1200.jpg)");
backgroundImageArray.push("url(../imgs/backgrounds/desktop_richfaces_1920x1200.jpg)");
backgroundImageArray.push("url(../imgs/backgrounds/desktop_seam_1920x1200.jpg)");
backgroundImageArray.push("url(../imgs/backgrounds/desktop_tools_1920x1200.gif)");
backgroundImageArray.push("url(../imgs/backgrounds/wildfly_desktop_1920x1200.jpg)");
backgroundImageArray.push("url(../imgs/backgrounds/coffee.jpg)");
backgroundImageArray.push("url(../imgs/backgrounds/java.jpg)");
backgroundImageArray.push("url(../imgs/backgrounds/python.png)");

var backgroundImageArrayLength = backgroundImageArray.length;

$.getJSON("https://api.github.com/repos/mttpla/matteopaoli-it/commits", function(data) {
    $('.lastcommit').text(data[0].sha.substr(0, 8));
    $('.lastdate').text(data[0].commit.committer.date.replace("T", " ").replace("Z", " "));
    document.getElementById("lasthtmlurl").setAttribute("href",data[0].html_url);
    
	});


function changeBackground() {
	var i = Math.floor((Math.random() * backgroundImageArrayLength) );
	document.body.style.backgroundImage= backgroundImageArray[i];

}
setInterval(changeBackground, 5000); //5 seconds

function changeMeImage() {
	var i = Math.floor((Math.random() * meImageArrayLength) );
	document.getElementById("myPic").src = meImageArray[i];

}  

setInterval(changeMeImage, 3000); //3 seconds


});
