(function ($) {
	var ww = $('#myWeather').iweather();
	
	$('#linksDiv a').click(function (e) {
		ww.addWeather($(this).attr('id'));
	})

})(jQuery)