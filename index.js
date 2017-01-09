(function ($) {
	var weather = new iWeather($('#myWeather'));
	weather.geoLoadWeather();
})(jQuery)